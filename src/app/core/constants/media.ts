export const MEDIA_LIMITS = {
  maxImageSizeBytes: 10 * 1024 * 1024,
  maxVideoSizeBytes: 80 * 1024 * 1024,
  maxImagesPerEntity: 20,
  maxVideosPerEntity: 5,
} as const;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];
export type VideoMimeType = (typeof VIDEO_MIME_TYPES)[number];

export const STORAGE_PATHS = {
  hostelCover: (hostelId: string, fileName: string) =>
    `hostels/${hostelId}/images/${fileName}`,
  hostelImage: (hostelId: string, fileName: string) =>
    `hostels/${hostelId}/images/${fileName}`,
  hostelVideo: (hostelId: string, fileName: string) =>
    `hostels/${hostelId}/videos/${fileName}`,
  roomImage: (roomId: string, fileName: string) => `rooms/${roomId}/images/${fileName}`,
  userAvatar: (uid: string, fileName: string) => `users/${uid}/avatar/${fileName}`,
} as const;
