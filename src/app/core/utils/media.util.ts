import { IMAGE_MIME_TYPES, MEDIA_LIMITS, VIDEO_MIME_TYPES } from '../constants/media';

export type MediaKind = 'image' | 'video';

export interface MediaValidationResult {
  readonly valid: boolean;
  readonly error: string | null;
}

export function isAllowedImageType(mimeType: string, fileName = ''): boolean {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return true;
  }
  return /\.(jpe?g|png|webp)$/i.test(fileName);
}

export function isAllowedVideoType(mimeType: string): boolean {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateMediaFile(file: File, kind: MediaKind): MediaValidationResult {
  if (kind === 'image') {
    if (!isAllowedImageType(file.type, file.name)) {
      return { valid: false, error: 'Please upload a JPG, JPEG, PNG, or WebP image.' };
    }
    if (!file.size) {
      return { valid: false, error: 'That file is empty. Choose another image.' };
    }
    if (file.size > MEDIA_LIMITS.maxImageSizeBytes) {
      return { valid: false, error: 'Images must be 10 MB or smaller.' };
    }
    return { valid: true, error: null };
  }

  if (!isAllowedVideoType(file.type) && !/\.(mp4|mov|webm)$/i.test(file.name)) {
    return { valid: false, error: 'Please upload an MP4, MOV, or WebM video.' };
  }
  if (!file.size) {
    return { valid: false, error: 'That file is empty. Choose another video.' };
  }
  if (file.size > MEDIA_LIMITS.maxVideoSizeBytes) {
    return { valid: false, error: 'Videos must be 80 MB or smaller.' };
  }
  return { valid: true, error: null };
}

export function uniqueFileName(originalName: string): string {
  const sanitized = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '-').toLowerCase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dot = sanitized.lastIndexOf('.');
  if (dot <= 0) {
    return `${stamp}-${sanitized}`;
  }
  return `${sanitized.slice(0, dot)}-${stamp}${sanitized.slice(dot)}`;
}
