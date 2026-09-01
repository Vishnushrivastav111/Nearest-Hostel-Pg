import { Auditable } from './common.model';
import { MediaAsset } from './media.model';

export interface Facility extends Auditable {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly icon?: string;
  readonly imageUrl?: string;
  readonly image?: MediaAsset;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface FacilityWriteInput {
  readonly name: string;
  readonly slug: string;
  readonly icon?: string;
  readonly imageUrl?: string;
  readonly image?: MediaAsset;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export const DEFAULT_FACILITY_NAMES = [
  'WiFi',
  'Food',
  'Laundry',
  'AC',
  'Parking',
  'Power Backup',
  'CCTV',
  'Security Guard',
  'Housekeeping',
  'RO Water',
  'Gym',
  'Common Area',
  'Attached Bathroom',
  'Geyser',
  'Lift',
  'Swimming Pool',
  'Study Area',
] as const;
