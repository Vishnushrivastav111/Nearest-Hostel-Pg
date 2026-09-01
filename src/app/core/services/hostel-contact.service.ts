import { Injectable, inject } from '@angular/core';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { AdminHostelContact, AdminHostelContactWriteInput } from '../models/hostel-contact.model';
import { AppError } from '../utils/error.util';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class HostelContactService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  getByHostelId(hostelId: string): Promise<AdminHostelContact | null> {
    return this.errors.wrap(() =>
      this.firestore.getById<AdminHostelContact>(COLLECTIONS.adminHostelContacts, hostelId),
    );
  }

  async upsert(input: AdminHostelContactWriteInput): Promise<void> {
    return this.errors.wrap(async () => {
      const uid = this.auth.currentUser()?.uid;
      if (!uid) {
        throw new AppError('unauthenticated', 'Please sign in as an admin to continue.');
      }
      await setDoc(
        this.firestore.docRef(COLLECTIONS.adminHostelContacts, input.hostelId),
        omitUndefined({
          hostelId: input.hostelId,
          contactName: input.contactName.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim().toLowerCase(),
          notes: input.notes?.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        }),
        { merge: true },
      );
    });
  }
}
