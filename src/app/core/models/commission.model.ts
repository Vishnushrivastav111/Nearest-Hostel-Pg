import { Timestamp } from 'firebase/firestore';
import { Auditable } from './common.model';

export const COMMISSION_TYPES = ['fixed', 'percentage'] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const COMMISSION_PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'] as const;
export type CommissionPaymentStatus = (typeof COMMISSION_PAYMENT_STATUSES)[number];

export interface Commission extends Auditable {
  readonly id: string;
  readonly bookingId: string;
  readonly hostelId: string;
  readonly amount: number;
  readonly type: CommissionType;
  readonly percentage?: number;
  readonly paymentStatus: CommissionPaymentStatus;
  readonly paymentDate?: Timestamp;
  readonly notes?: string;
}

export interface CommissionWriteInput {
  readonly bookingId: string;
  readonly hostelId: string;
  readonly amount: number;
  readonly type: CommissionType;
  readonly percentage?: number;
  readonly notes?: string;
}

export interface CommissionCalculationInput {
  readonly monthlyRent: number;
  readonly type: CommissionType;
  readonly fixedAmount?: number;
  readonly percentage?: number;
}
