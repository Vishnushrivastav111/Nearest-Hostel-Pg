import { Timestamp } from 'firebase/firestore';
import { Auditable, SoftDeletable } from './common.model';
import { MediaAsset } from './media.model';

export const HOSTEL_TYPES = ['boys', 'girls', 'co-living', 'other'] as const;
export type HostelType = (typeof HOSTEL_TYPES)[number];

export const HOSTEL_STATUSES = ['draft', 'published', 'unpublished'] as const;
export type HostelStatus = (typeof HOSTEL_STATUSES)[number];

export interface HostelSeo {
  readonly title?: string;
  readonly description?: string;
  readonly keywords?: string[];
}

export interface Hostel extends Auditable, SoftDeletable {
  readonly id: string;
  readonly name: string;
  readonly nameLower: string;
  readonly slug: string;
  readonly description: string;
  readonly type: HostelType;
  readonly address: string;
  readonly area: string;
  readonly city: string;
  readonly state: string;
  readonly pincode: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly mapUrl?: string;
  readonly coverImage?: string;
  readonly imageUrls: string[];
  readonly videoUrls: string[];
  readonly images?: MediaAsset[];
  readonly videos?: MediaAsset[];
  readonly coverPublicId?: string;
  readonly facilities: string[];
  readonly startingPrice: number;
  readonly deposit?: number;
  readonly rating?: number;
  readonly reviewCount?: number;
  readonly isFeatured: boolean;
  readonly isVerified: boolean;
  readonly isActive: boolean;
  readonly status: HostelStatus;
  readonly seo?: HostelSeo;
  readonly nearbyInfo?: string;
}

export interface HostelWriteInput {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly type: HostelType;
  readonly address: string;
  readonly area: string;
  readonly city: string;
  readonly state: string;
  readonly pincode: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly mapUrl?: string;
  readonly coverImage?: string;
  readonly imageUrls: string[];
  readonly videoUrls: string[];
  readonly images?: MediaAsset[];
  readonly videos?: MediaAsset[];
  readonly coverPublicId?: string;
  readonly facilities: string[];
  readonly startingPrice: number;
  readonly deposit?: number;
  readonly isFeatured: boolean;
  readonly isVerified: boolean;
  readonly isActive: boolean;
  readonly status: HostelStatus;
  readonly seo?: HostelSeo;
  readonly nearbyInfo?: string;
}

export interface HostelListFilters {
  readonly city?: string;
  readonly area?: string;
  readonly type?: HostelType;
  readonly status?: HostelStatus;
  readonly isFeatured?: boolean;
  readonly isVerified?: boolean;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly search?: string;
  readonly availableOnly?: boolean;
  readonly facilities?: string[];
  readonly sharingType?: string;
}

export interface HostelCreateDraft extends HostelWriteInput {
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}
