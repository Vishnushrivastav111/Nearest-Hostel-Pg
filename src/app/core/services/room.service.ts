import { Injectable, inject } from '@angular/core';
import { QueryConstraint, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { COLLECTIONS } from '../constants/collections';
import { HostelStatus } from '../models/hostel.model';
import { Room, RoomWriteInput } from '../models/room.model';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';
import { HostelService } from './hostel.service';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);
  private readonly hostels = inject(HostelService);

  getById(id: string): Promise<Room | null> {
    return this.errors.wrap(() => this.firestore.getById<Room>(COLLECTIONS.rooms, id));
  }

  getRoomById(id: string): Promise<Room | null> {
    return this.getById(id);
  }

  getRoomsByHostel(hostelId: string): Promise<Room[]> {
    return this.listByHostel(hostelId);
  }

  getAvailableRoomsByHostel(hostelId: string): Promise<Room[]> {
    return this.errors.wrap(async () => {
      const rooms = await this.listByHostel(hostelId, true);
      return rooms.filter((room) => room.isAvailable && room.availableBeds > 0);
    });
  }

  getAllRoomsForAdmin(hostelId: string): Promise<Room[]> {
    return this.listByHostel(hostelId, false);
  }

  createRoom(input: RoomWriteInput): Promise<string> {
    return this.create(input);
  }

  updateRoom(id: string, input: Partial<RoomWriteInput>): Promise<void> {
    return this.update(id, input);
  }

  deactivateRoom(id: string): Promise<void> {
    return this.softDelete(id);
  }

  updateAvailability(id: string, isAvailable: boolean): Promise<void> {
    return this.setAvailability(id, isAvailable);
  }

  watchByHostel(hostelId: string): Observable<Room[]> {
    return this.firestore.watchQuery<Room>(COLLECTIONS.rooms, where('hostelId', '==', hostelId));
  }

  listByHostel(hostelId: string, publicOnly = false): Promise<Room[]> {
    return this.errors.wrap(async () => {
      const constraints: QueryConstraint[] = publicOnly
        ? [
            where('hostelId', '==', hostelId),
            where('isDeleted', '==', false),
            where('isActive', '==', true),
            where('hostelStatus', '==', 'published'),
          ]
        : [where('hostelId', '==', hostelId)];
      const rooms = await this.firestore.getDocs<Room>(COLLECTIONS.rooms, ...constraints);
      return rooms
        .filter((room) => !room.isDeleted && (!publicOnly || (room.isActive && room.hostelStatus === 'published')))
        .sort((left, right) => left.price - right.price);
    });
  }

  async create(input: RoomWriteInput): Promise<string> {
    return this.errors.wrap(async () => {
      const ref = this.firestore.newDocRef(COLLECTIONS.rooms);
      const availableBeds = Math.max(0, Math.min(input.availableBeds, input.totalBeds));
      await setDoc(
        ref,
        omitUndefined({
          ...input,
          availableBeds,
          isAvailable: availableBeds > 0 && input.isAvailable,
          isDeleted: false,
          ...this.firestore.auditFields(this.auth.currentUser()?.uid),
        }),
      );
      await this.syncHostelStartingPrice(input.hostelId);
      return ref.id;
    });
  }

  async update(id: string, input: Partial<RoomWriteInput>): Promise<void> {
    return this.errors.wrap(async () => {
      const current = await this.firestore.getById<Room>(COLLECTIONS.rooms, id);
      if (!current) {
        return;
      }
      const totalBeds = input.totalBeds ?? current.totalBeds;
      const availableBeds = Math.max(
        0,
        Math.min(input.availableBeds ?? current.availableBeds, totalBeds),
      );
      await updateDoc(
        this.firestore.docRef(COLLECTIONS.rooms, id),
        omitUndefined({
          ...input,
          availableBeds,
          isAvailable:
            availableBeds > 0 && (input.isAvailable ?? current.isAvailable),
          ...this.firestore.touchFields(this.auth.currentUser()?.uid),
        }),
      );
      await this.syncHostelStartingPrice(current.hostelId);
    });
  }

  async setAvailability(id: string, isAvailable: boolean): Promise<void> {
    return this.update(id, { isAvailable });
  }

  async softDelete(id: string): Promise<void> {
    return this.errors.wrap(async () => {
      const current = await this.firestore.getById<Room>(COLLECTIONS.rooms, id);
      if (!current) {
        return;
      }
      await updateDoc(this.firestore.docRef(COLLECTIONS.rooms, id), {
        isDeleted: true,
        isActive: false,
        isAvailable: false,
        deletedAt: serverTimestamp(),
        deletedBy: this.auth.currentUser()?.uid,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
      await this.syncHostelStartingPrice(current.hostelId);
    });
  }

  async syncHostelStatus(hostelId: string, hostelStatus: HostelStatus): Promise<void> {
    return this.errors.wrap(async () => {
      const rooms = await this.listByHostel(hostelId);
      const batch = this.firestore.batch();
      for (const room of rooms) {
        batch.update(this.firestore.docRef(COLLECTIONS.rooms, room.id), {
          hostelStatus,
          ...this.firestore.touchFields(this.auth.currentUser()?.uid),
        });
      }
      if (rooms.length > 0) {
        await batch.commit();
      }
    });
  }

  async syncHostelStartingPrice(hostelId: string): Promise<void> {
    const rooms = await this.listByHostel(hostelId);
    const priced = rooms.filter((room) => room.isActive && room.availableBeds > 0);
    const startingPrice =
      priced.length > 0 ? Math.min(...priced.map((room) => room.price)) : 0;
    await this.hostels.updateStartingPrice(hostelId, startingPrice);
  }
}
