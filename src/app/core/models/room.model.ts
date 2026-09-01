import { Auditable, SoftDeletable } from './common.model';
import { HostelStatus } from './hostel.model';
import { MediaAsset } from './media.model';

export const SHARING_TYPES = ['single', 'double', 'triple', 'four', 'other'] as const;
export type SharingType = (typeof SHARING_TYPES)[number];

export interface Room extends Auditable, SoftDeletable {
  readonly id: string;
  readonly hostelId: string;
  readonly hostelStatus: HostelStatus;
  readonly roomName: string;
  readonly roomNumber?: string;
  readonly sharingType: SharingType;
  readonly price: number;
  readonly deposit?: number;
  readonly totalBeds: number;
  readonly availableBeds: number;
  readonly facilities: string[];
  readonly imageUrls: string[];
  readonly images?: MediaAsset[];
  readonly description?: string;
  readonly isAvailable: boolean;
  readonly isActive: boolean;
}

export interface RoomWriteInput {
  readonly hostelId: string;
  readonly hostelStatus: HostelStatus;
  readonly roomName: string;
  readonly roomNumber?: string;
  readonly sharingType: SharingType;
  readonly price: number;
  readonly deposit?: number;
  readonly totalBeds: number;
  readonly availableBeds: number;
  readonly facilities: string[];
  readonly imageUrls: string[];
  readonly images?: MediaAsset[];
  readonly description?: string;
  readonly isAvailable: boolean;
  readonly isActive: boolean;
}
