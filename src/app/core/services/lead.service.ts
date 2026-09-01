import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { DUPLICATE_LEAD_WINDOW_MINUTES, PAGINATION } from '../constants/app.constants';
import { COLLECTIONS, LEAD_HISTORY_SUBCOLLECTION } from '../constants/collections';
import { PageRequest, PageResult } from '../models/common.model';
import { Lead, LeadStatus, LeadWriteInput } from '../models/lead.model';
import { AppError } from '../utils/error.util';
import { omitUndefined } from '../utils/firestore.util';
import { isValidIndianMobile, isValidOptionalEmail, normalizeIndianMobile } from '../utils/phone.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  getById(id: string): Promise<Lead | null> {
    return this.errors.wrap(() => this.firestore.getById<Lead>(COLLECTIONS.leads, id));
  }

  getLeadById(id: string): Promise<Lead | null> {
    return this.getById(id);
  }

  getAdminLeads(status?: LeadStatus, page?: PageRequest): Promise<PageResult<Lead>> {
    return this.listAdmin(status, page);
  }

  createLead(input: LeadWriteInput): Promise<{ id: string; duplicate: boolean }> {
    return this.create(input);
  }

  updateLeadStatus(id: string, status: LeadStatus, notes?: string): Promise<void> {
    return this.updateStatus(id, status, notes);
  }

  updateLeadNotes(id: string, notes: string): Promise<void> {
    return this.addNotes(id, notes);
  }

  watchById(id: string): Observable<Lead | null> {
    return this.firestore.watchById<Lead>(COLLECTIONS.leads, id);
  }

  listByUser(userId: string): Promise<Lead[]> {
    return this.errors.wrap(async () => {
      const items = await this.firestore.getDocs<Lead>(
        COLLECTIONS.leads,
        where('userId', '==', userId),
      );
      return items.sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
    });
  }

  listAdmin(status?: LeadStatus, page?: PageRequest): Promise<PageResult<Lead>> {
    return this.errors.wrap(async () => {
      const items = status
        ? await this.firestore.getDocs<Lead>(COLLECTIONS.leads, where('status', '==', status))
        : await this.firestore.getDocs<Lead>(COLLECTIONS.leads);
      const sorted = items.sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
      const pageSize = page?.pageSize ?? PAGINATION.adminPageSize;
      return {
        items: sorted.slice(0, pageSize),
        nextCursor: null,
        hasMore: sorted.length > pageSize,
      };
    });
  }

  async findRecentDuplicate(
    customerPhone: string,
    hostelId: string,
    roomId?: string,
  ): Promise<Lead | null> {
    const phone = normalizeIndianMobile(customerPhone);
    const windowStart = Date.now() - DUPLICATE_LEAD_WINDOW_MINUTES * 60 * 1000;
    const uid = this.auth.currentUser()?.uid;
    if (!uid) {
      return null;
    }
    try {
      const matches = await this.firestore.getDocs<Lead>(
        COLLECTIONS.leads,
        where('userId', '==', uid),
      );
      return (
        matches.find((item) => {
          if (item.hostelId !== hostelId) {
            return false;
          }
          if (item.customerPhone !== phone) {
            return false;
          }
          if (roomId && item.roomId !== roomId) {
            return false;
          }
          return toMillis(item.createdAt) >= windowStart;
        }) ?? null
      );
    } catch {
      return null;
    }
  }

  async create(input: LeadWriteInput): Promise<{ id: string; duplicate: boolean }> {
    try {
      return await this.errors.wrap(async () => {
        if (!input.hostelId?.trim()) {
          throw new AppError('invalid-argument', 'This hostel could not be identified. Please refresh and try again.');
        }
        if (!input.customerName?.trim()) {
          throw new AppError('invalid-argument', 'Please enter your name.');
        }
        if (!isValidIndianMobile(input.customerPhone)) {
          throw new AppError('invalid-argument', 'Please enter a valid 10-digit Indian mobile number.');
        }
        if (!isValidOptionalEmail(input.customerEmail)) {
          throw new AppError('invalid-argument', 'Please enter a valid email address.');
        }

        const phone = normalizeIndianMobile(input.customerPhone);
        const user = (await this.auth.waitForUser()) ?? this.auth.currentUser();
        const uid = user?.uid;
        const payload = omitUndefined({
          hostelId: input.hostelId.trim(),
          hostelName: input.hostelName?.trim(),
          roomId: input.roomId || undefined,
          roomName: input.roomName,
          ...(uid ? { userId: uid } : {}),
          customerName: input.customerName.trim(),
          customerPhone: phone,
          customerEmail: input.customerEmail?.trim().toLowerCase() || undefined,
          moveInDate: input.moveInDate,
          occupants: Number.isFinite(Number(input.occupants)) ? Number(input.occupants) : 1,
          message: input.message?.trim() || undefined,
          source: 'website',
          status: 'new',
          ...this.firestore.auditFields(uid),
        });
        const id = await this.firestore.create(COLLECTIONS.leads, payload);
        return { id, duplicate: false };
      });
    } catch (error) {
      const mapped = error instanceof AppError ? error : this.errors.toAppError(error);
      if (mapped.code === 'failed-precondition' || mapped.code === 'permission-denied') {
        throw new AppError(
          mapped.code,
          'Could not submit your booking request. Please try again.',
          mapped.original,
        );
      }
      throw mapped;
    }
  }

  async updateStatus(id: string, status: LeadStatus, notes?: string): Promise<void> {
    return this.errors.wrap(async () => {
      const current = await this.firestore.getById<Lead>(COLLECTIONS.leads, id);
      if (!current) {
        throw new AppError('not-found', 'Enquiry was not found.');
      }
      const uid = this.auth.currentUser()?.uid;
      await updateDoc(
        this.firestore.docRef(COLLECTIONS.leads, id),
        omitUndefined({
          status,
          notes: notes ?? current.notes,
          ...this.firestore.touchFields(uid),
        }),
      );
      await this.appendHistory(id, current.status, status, notes, uid);
    });
  }

  async addNotes(id: string, notes: string): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.leads, id), {
        notes,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }

  private async appendHistory(
    leadId: string,
    fromStatus: LeadStatus | null,
    toStatus: LeadStatus,
    note: string | undefined,
    actorId: string | undefined,
  ): Promise<void> {
    const historyRef = doc(
      collection(this.firestore.native, COLLECTIONS.leads, leadId, LEAD_HISTORY_SUBCOLLECTION),
    );
    await setDoc(
      historyRef,
      omitUndefined({
        fromStatus,
        toStatus,
        note,
        actorId: actorId ?? 'system',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
  }
}

function toMillis(value: Lead['createdAt'] | Date | undefined): number {
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
