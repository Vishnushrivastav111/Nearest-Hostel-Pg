import { Timestamp } from 'firebase/firestore';
import { Auditable } from './common.model';

export const NOTIFICATION_RECIPIENT_TYPES = ['admin', 'customer'] as const;
export type NotificationRecipientType = (typeof NOTIFICATION_RECIPIENT_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'new_lead',
  'lead_status_changed',
  'new_booking',
  'booking_created',
  'booking_confirmed',
  'booking_cancelled',
  'new_review',
  'request_received',
  'request_status_updated',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification extends Auditable {
  readonly id: string;
  readonly recipientId: string;
  readonly recipientType: NotificationRecipientType;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly isRead: boolean;
  readonly readAt?: Timestamp;
  readonly hostelId?: string;
  readonly leadId?: string;
  readonly bookingId?: string;
}

export interface NotificationWriteInput {
  readonly recipientId: string;
  readonly recipientType: NotificationRecipientType;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly hostelId?: string;
  readonly leadId?: string;
  readonly bookingId?: string;
}
