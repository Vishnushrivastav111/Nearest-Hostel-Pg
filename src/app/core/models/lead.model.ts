import { Timestamp } from 'firebase/firestore';
import { Auditable } from './common.model';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'interested',
  'visited',
  'booked',
  'rejected',
  'cancelled',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ['website'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface Lead extends Auditable {
  readonly id: string;
  readonly hostelId: string;
  readonly hostelName?: string;
  readonly roomId?: string;
  readonly roomName?: string;
  readonly userId?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail?: string;
  readonly moveInDate?: Timestamp;
  readonly occupants?: number;
  readonly message?: string;
  readonly source: LeadSource;
  readonly status: LeadStatus;
  readonly notes?: string;
}

export interface LeadWriteInput {
  readonly hostelId: string;
  readonly hostelName?: string;
  readonly roomId?: string;
  readonly roomName?: string;
  readonly userId?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail?: string;
  readonly moveInDate?: Timestamp;
  readonly occupants?: number;
  readonly message?: string;
}

export interface LeadHistoryEntry extends Auditable {
  readonly id: string;
  readonly fromStatus: LeadStatus | null;
  readonly toStatus: LeadStatus;
  readonly note?: string;
  readonly actorId: string;
}
