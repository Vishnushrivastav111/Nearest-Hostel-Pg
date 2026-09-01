import { Timestamp } from 'firebase/firestore';
import { Auditable } from './common.model';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking extends Auditable {
  readonly id: string;
  readonly leadId: string;
  readonly hostelId: string;
  readonly hostelName?: string;
  readonly roomId?: string;
  readonly roomName?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly bookingDate: Timestamp;
  readonly moveInDate?: Timestamp;
  readonly monthlyRent: number;
  readonly deposit?: number;
  readonly status: BookingStatus;
  readonly occupants?: number;
}

export interface ConvertLeadToBookingInput {
  readonly leadId: string;
  readonly monthlyRent?: number;
  readonly deposit?: number;
  readonly bookingDate?: Timestamp;
  readonly createCommission?: boolean;
}
