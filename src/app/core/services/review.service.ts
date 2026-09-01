import { Injectable, inject } from '@angular/core';
import { orderBy, setDoc, updateDoc, where } from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { Review, ReviewStatus, ReviewWriteInput } from '../models/review.model';
import { AppError } from '../utils/error.util';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  getApprovedReviews(hostelId: string): Promise<Review[]> {
    return this.listApproved(hostelId);
  }

  getAdminReviews(status?: ReviewStatus): Promise<Review[]> {
    return this.listAdmin(status);
  }

  createReview(input: ReviewWriteInput): Promise<string> {
    return this.create(input);
  }

  approveReview(id: string): Promise<void> {
    return this.setStatus(id, 'approved');
  }

  hideReview(id: string): Promise<void> {
    return this.hide(id);
  }

  listApproved(hostelId: string): Promise<Review[]> {
    return this.errors.wrap(async () => {
      const reviews = await this.firestore.getDocs<Review>(
        COLLECTIONS.reviews,
        where('hostelId', '==', hostelId),
        where('status', '==', 'approved'),
      );
      return reviews.sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
    });
  }

  listAdmin(status?: ReviewStatus): Promise<Review[]> {
    return this.errors.wrap(() => {
      const constraints = status
        ? [where('status', '==', status), orderBy('createdAt', 'desc')]
        : [orderBy('createdAt', 'desc')];
      return this.firestore.getDocs<Review>(COLLECTIONS.reviews, ...constraints);
    });
  }

  async create(input: ReviewWriteInput): Promise<string> {
    return this.errors.wrap(async () => {
      if (input.rating < 1 || input.rating > 5) {
        throw new AppError('invalid-argument', 'Rating must be between 1 and 5.');
      }
      const existing = await this.firestore.getDocs<Review>(
        COLLECTIONS.reviews,
        where('userId', '==', input.userId),
        where('hostelId', '==', input.hostelId),
      );
      const latest = [...existing].sort(
        (left, right) => toMillis(right.createdAt) - toMillis(left.createdAt),
      )[0];
      if (latest && latest.status !== 'hidden') {
        throw new AppError('already-exists', 'You have already reviewed this hostel.');
      }
      const ref = this.firestore.newDocRef(COLLECTIONS.reviews);
      await setDoc(
        ref,
        omitUndefined({
          ...input,
          comment: input.comment.trim(),
          status: 'pending',
          ...this.firestore.auditFields(this.auth.currentUser()?.uid),
        }),
      );
      return ref.id;
    });
  }

  async setStatus(id: string, status: ReviewStatus): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.reviews, id), {
        status,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }

  async hide(id: string): Promise<void> {
    return this.setStatus(id, 'hidden');
  }
}

function toMillis(value: Review['createdAt'] | Date | undefined): number {
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
