import { Injectable, inject } from '@angular/core';
import {
  Timestamp,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { PAGINATION } from '../constants/app.constants';
import { COLLECTIONS, LEAD_HISTORY_SUBCOLLECTION } from '../constants/collections';
import { PageRequest, PageResult } from '../models/common.model';
import { Booking, BookingStatus, ConvertLeadToBookingInput } from '../models/booking.model';
import { Hostel } from '../models/hostel.model';
import { Lead } from '../models/lead.model';
import { Room } from '../models/room.model';
import { AppSettings } from '../models/settings.model';
import { SETTINGS_DOC_IDS } from '../constants/collections';
import { AppError } from '../utils/error.util';
import { calculateCommissionAmount } from '../utils/commission.util';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  getById(id: string): Promise<Booking | null> {
    return this.errors.wrap(() => this.firestore.getById<Booking>(COLLECTIONS.bookings, id));
  }

  getBookingById(id: string): Promise<Booking | null> {
    return this.getById(id);
  }

  getAdminBookings(status?: BookingStatus, page?: PageRequest): Promise<PageResult<Booking>> {
    return this.listAdmin(status, page);
  }

  createBooking(input: ConvertLeadToBookingInput): Promise<string> {
    return this.convertLeadToBooking(input);
  }

  updateBooking(id: string, status: BookingStatus): Promise<void> {
    return this.setStatus(id, status);
  }

  cancelBooking(id: string): Promise<void> {
    return this.setStatus(id, 'cancelled');
  }

  listAdmin(status?: BookingStatus, page?: PageRequest): Promise<PageResult<Booking>> {
    return this.errors.wrap(async () => {
      const items = status
        ? await this.firestore.getDocs<Booking>(COLLECTIONS.bookings, where('status', '==', status))
        : await this.firestore.getDocs<Booking>(COLLECTIONS.bookings);
      const sorted = items.sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
      const pageSize = page?.pageSize ?? PAGINATION.adminPageSize;
      return {
        items: sorted.slice(0, pageSize),
        nextCursor: null,
        hasMore: sorted.length > pageSize,
      };
    });
  }

  async setStatus(id: string, status: BookingStatus): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.bookings, id), {
        status,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }

  async convertLeadToBooking(input: ConvertLeadToBookingInput): Promise<string> {
    return this.errors.wrap(async () => {
      const uid = this.auth.currentUser()?.uid;
      const db = this.firestore.native;

      const bookingId = await runTransaction(db, async (transaction) => {
        const leadRef = doc(db, COLLECTIONS.leads, input.leadId);
        const leadSnap = await transaction.get(leadRef);
        if (!leadSnap.exists()) {
          throw new AppError('not-found', 'Enquiry was not found.');
        }
        const lead = { id: leadSnap.id, ...leadSnap.data() } as Lead;
        if (lead.status === 'booked') {
          throw new AppError('already-exists', 'This enquiry is already booked.');
        }
        if (lead.status === 'rejected' || lead.status === 'cancelled') {
          throw new AppError('app/invalid-lead', 'This enquiry cannot be converted to a booking.');
        }

        const hostelRef = doc(db, COLLECTIONS.hostels, lead.hostelId);
        const hostelSnap = await transaction.get(hostelRef);
        if (!hostelSnap.exists()) {
          throw new AppError('not-found', 'Hostel was not found.');
        }
        const hostel = { id: hostelSnap.id, ...hostelSnap.data() } as Hostel;

        let room: Room | null = null;
        if (lead.roomId) {
          const roomRef = doc(db, COLLECTIONS.rooms, lead.roomId);
          const roomSnap = await transaction.get(roomRef);
          if (!roomSnap.exists()) {
            throw new AppError('not-found', 'Room was not found.');
          }
          room = { id: roomSnap.id, ...roomSnap.data() } as Room;
          if (room.availableBeds < 1) {
            throw new AppError('app/no-beds', 'This room no longer has available beds.');
          }
          const nextBeds = room.availableBeds - 1;
          transaction.update(roomRef, {
            availableBeds: nextBeds,
            isAvailable: nextBeds > 0,
            updatedAt: serverTimestamp(),
            updatedBy: uid,
          });
        }

        const monthlyRent = input.monthlyRent ?? room?.price ?? hostel.startingPrice;
        const deposit = input.deposit ?? room?.deposit ?? hostel.deposit;
        const bookingRef = doc(collection(db, COLLECTIONS.bookings));
        transaction.set(
          bookingRef,
          omitUndefined({
            leadId: lead.id,
            hostelId: lead.hostelId,
            hostelName: lead.hostelName ?? hostel.name,
            roomId: lead.roomId,
            roomName: lead.roomName ?? room?.roomName,
            customerName: lead.customerName,
            customerPhone: lead.customerPhone,
            bookingDate: input.bookingDate ?? Timestamp.now(),
            moveInDate: lead.moveInDate,
            monthlyRent,
            deposit,
            status: 'pending',
            occupants: lead.occupants,
            ...this.firestore.auditFields(uid),
          }),
        );

        transaction.update(leadRef, {
          status: 'booked',
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });

        const historyRef = doc(
          collection(db, COLLECTIONS.leads, lead.id, LEAD_HISTORY_SUBCOLLECTION),
        );
        transaction.set(
          historyRef,
          omitUndefined({
            fromStatus: lead.status,
            toStatus: 'booked',
            note: 'Converted to booking',
            actorId: uid ?? 'system',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: uid,
            updatedBy: uid,
          }),
        );

        if (input.createCommission !== false) {
          const settingsSnap = await transaction.get(
            doc(db, COLLECTIONS.settings, SETTINGS_DOC_IDS.app),
          );
          const settings = settingsSnap.exists()
            ? ({ id: 'app', ...settingsSnap.data() } as AppSettings)
            : null;
          const type = settings?.defaultCommissionType ?? 'fixed';
          const amount = calculateCommissionAmount({
            monthlyRent,
            type,
            fixedAmount: settings?.defaultCommissionAmount ?? 0,
            percentage: settings?.defaultCommissionPercentage ?? 0,
          });
          const commissionRef = doc(collection(db, COLLECTIONS.commissions));
          transaction.set(
            commissionRef,
            omitUndefined({
              bookingId: bookingRef.id,
              hostelId: hostel.id,
              amount,
              type,
              percentage: type === 'percentage' ? settings?.defaultCommissionPercentage : undefined,
              paymentStatus: 'pending',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: uid,
              updatedBy: uid,
            }),
          );
        }

        return bookingRef.id;
      });

      return bookingId;
    });
  }
}

function toMillis(value: Booking['createdAt'] | Date | undefined): number {
  if (!value) {
    return 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}
