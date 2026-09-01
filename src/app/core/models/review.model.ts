import { Auditable } from './common.model';

export const REVIEW_STATUSES = ['pending', 'approved', 'hidden'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review extends Auditable {
  readonly id: string;
  readonly hostelId: string;
  readonly userId: string;
  readonly userName: string;
  readonly rating: number;
  readonly comment: string;
  readonly status: ReviewStatus;
  readonly bookingId?: string;
}

export interface ReviewWriteInput {
  readonly hostelId: string;
  readonly userId: string;
  readonly userName: string;
  readonly rating: number;
  readonly comment: string;
  readonly bookingId?: string;
}
