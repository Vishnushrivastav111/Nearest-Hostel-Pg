export type MediaResourceType = 'image' | 'video';

export interface MediaAsset {
  readonly publicId: string;
  readonly secureUrl: string;
  readonly originalFileName: string;
  readonly format: string;
  readonly bytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly resourceType: MediaResourceType;
  readonly folder: string;
  readonly uploadedAt: string;
}

export interface CloudinarySignRequest {
  readonly folder: CloudinaryFolderName;
  readonly resourceType: MediaResourceType;
  readonly publicId?: string;
}

export interface CloudinarySignResponse {
  readonly cloudName: string;
  readonly apiKey: string;
  readonly timestamp: number;
  readonly signature: string;
  readonly folder: string;
  readonly publicId: string;
  readonly resourceType: MediaResourceType;
}

export type CloudinaryFolderName =
  | 'hostel-booking/hostels'
  | 'hostel-booking/rooms'
  | 'hostel-booking/videos'
  | 'hostel-booking/amenities'
  | 'hostel-booking/profiles';
