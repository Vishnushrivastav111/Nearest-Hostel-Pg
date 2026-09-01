import { Injectable, inject } from '@angular/core';
import { orderBy, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { COLLECTIONS } from '../constants/collections';
import { AppNotification, NotificationWriteInput } from '../models/notification.model';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  watchForRecipient(recipientId: string): Observable<AppNotification[]> {
    return this.firestore.watchQuery<AppNotification>(
      COLLECTIONS.notifications,
      where('recipientId', '==', recipientId),
      orderBy('createdAt', 'desc'),
    );
  }

  async create(input: NotificationWriteInput): Promise<string> {
    return this.errors.wrap(async () => {
      const ref = this.firestore.newDocRef(COLLECTIONS.notifications);
      await setDoc(
        ref,
        omitUndefined({
          ...input,
          isRead: false,
          ...this.firestore.auditFields(this.auth.currentUser()?.uid),
        }),
      );
      return ref.id;
    });
  }

  async markRead(id: string): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.notifications, id), {
        isRead: true,
        readAt: serverTimestamp(),
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }
}
