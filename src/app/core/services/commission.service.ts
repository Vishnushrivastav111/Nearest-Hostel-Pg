import { Injectable, inject } from '@angular/core';
import { Timestamp, orderBy, setDoc, updateDoc, where } from 'firebase/firestore';
import { PAGINATION } from '../constants/app.constants';
import { COLLECTIONS } from '../constants/collections';
import { PageRequest, PageResult } from '../models/common.model';
import { Commission, CommissionPaymentStatus, CommissionWriteInput } from '../models/commission.model';
import { AppError } from '../utils/error.util';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class CommissionService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  getById(id: string): Promise<Commission | null> {
    return this.errors.wrap(() => this.firestore.getById<Commission>(COLLECTIONS.commissions, id));
  }

  getCommissionById(id: string): Promise<Commission | null> {
    return this.getById(id);
  }

  getCommissions(
    paymentStatus?: CommissionPaymentStatus,
    page?: PageRequest,
  ): Promise<PageResult<Commission>> {
    return this.listAdmin(paymentStatus, page);
  }

  async createCommission(input: CommissionWriteInput): Promise<string> {
    return this.errors.wrap(async () => {
      const ref = this.firestore.newDocRef(COLLECTIONS.commissions);
      await setDoc(
        ref,
        omitUndefined({
          ...input,
          paymentStatus: 'pending',
          ...this.firestore.auditFields(this.auth.currentUser()?.uid),
        }),
      );
      return ref.id;
    });
  }

  async updateCommission(
    id: string,
    patch: Partial<Pick<Commission, 'amount' | 'notes' | 'type' | 'percentage'>>,
  ): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(
        this.firestore.docRef(COLLECTIONS.commissions, id),
        omitUndefined({
          ...patch,
          ...this.firestore.touchFields(this.auth.currentUser()?.uid),
        }),
      );
    });
  }

  markCommissionPaid(id: string, paymentDate = Timestamp.now()): Promise<void> {
    return this.markPaid(id, paymentDate);
  }

  cancelCommission(id: string): Promise<void> {
    return this.cancel(id);
  }

  listAdmin(
    paymentStatus?: CommissionPaymentStatus,
    page?: PageRequest,
  ): Promise<PageResult<Commission>> {
    return this.errors.wrap(() => {
      const constraints = paymentStatus
        ? [where('paymentStatus', '==', paymentStatus), orderBy('createdAt', 'desc')]
        : [orderBy('createdAt', 'desc')];
      return this.firestore.getPage<Commission>(
        COLLECTIONS.commissions,
        page?.pageSize ?? PAGINATION.adminPageSize,
        page?.cursor,
        constraints,
      );
    });
  }

  async markPaid(id: string, paymentDate = Timestamp.now()): Promise<void> {
    return this.errors.wrap(async () => {
      const current = await this.firestore.getById<Commission>(COLLECTIONS.commissions, id);
      if (!current) {
        throw new AppError('not-found', 'Commission record was not found.');
      }
      if (current.paymentStatus === 'paid') {
        throw new AppError('already-exists', 'This commission is already marked as paid.');
      }
      await updateDoc(this.firestore.docRef(COLLECTIONS.commissions, id), {
        paymentStatus: 'paid',
        paymentDate,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }

  async cancel(id: string): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.commissions, id), {
        paymentStatus: 'cancelled',
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }
}
