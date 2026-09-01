import { Injectable, inject } from '@angular/core';
import { serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { Facility, FacilityWriteInput } from '../models/facility.model';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class FacilityService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  listActive(): Promise<Facility[]> {
    return this.errors.wrap(async () => {
      const items = await this.firestore.getDocs<Facility>(
        COLLECTIONS.facilities,
        where('isActive', '==', true),
      );
      return items.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
    });
  }

  listAll(): Promise<Facility[]> {
    return this.errors.wrap(async () => {
      const items = await this.firestore.getDocs<Facility>(COLLECTIONS.facilities);
      return items.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
    });
  }

  async create(input: FacilityWriteInput): Promise<string> {
    return this.errors.wrap(async () => {
      const ref = this.firestore.newDocRef(COLLECTIONS.facilities);
      await setDoc(
        ref,
        omitUndefined({
          ...input,
          ...this.firestore.auditFields(this.auth.currentUser()?.uid),
        }),
      );
      return ref.id;
    });
  }

  async update(id: string, input: Partial<FacilityWriteInput>): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(
        this.firestore.docRef(COLLECTIONS.facilities, id),
        omitUndefined({
          ...input,
          ...this.firestore.touchFields(this.auth.currentUser()?.uid),
        }),
      );
    });
  }

  async deactivate(id: string): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.facilities, id), {
        isActive: false,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
        deletedAt: serverTimestamp(),
      });
    });
  }
}
