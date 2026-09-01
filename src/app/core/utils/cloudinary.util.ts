import { MediaAsset, MediaResourceType } from '../models/media.model';
import { environment } from '../../../environments/environment';

export function isHttpUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^https?:\/\//i.test(value.trim()) &&
    !value.startsWith('blob:') &&
    !value.startsWith('data:')
  );
}

export function asMediaUrl(value: unknown): string {
  if (isHttpUrl(value)) {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (isHttpUrl(record['secureUrl'])) {
      return String(record['secureUrl']).trim();
    }
    if (isHttpUrl(record['secure_url'])) {
      return String(record['secure_url']).trim();
    }
    if (isHttpUrl(record['url'])) {
      return String(record['url']).trim();
    }
  }
  return '';
}

export function isCloudinaryUrl(url: string | null | undefined): boolean {
  return !!url && url.includes('res.cloudinary.com');
}

export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  options: { readonly width?: number; readonly height?: number; readonly crop?: string } = {},
): string {
  const safe = asMediaUrl(url);
  if (!safe) {
    return '';
  }
  if (!isCloudinaryUrl(safe)) {
    return safe;
  }
  const width = options.width ?? 1200;
  const crop = options.crop ?? 'fill';
  const heightPart = options.height ? `,h_${options.height}` : '';
  const transform = `f_auto,q_auto,c_${crop},w_${width}${heightPart}`;
  if (safe.includes('/image/upload/')) {
    return safe.replace('/image/upload/', `/image/upload/${transform}/`);
  }
  if (safe.includes('/video/upload/')) {
    return safe.replace('/video/upload/', `/video/upload/${transform}/`);
  }
  return safe;
}

export function assetFromLegacyUrl(
  url: string,
  resourceType: MediaResourceType,
  folder: string,
): MediaAsset {
  const secureUrl = asMediaUrl(url);
  return sanitizeMediaAsset({
    publicId: publicIdFromUrl(secureUrl) ?? secureUrl,
    secureUrl,
    originalFileName: fileNameFromUrl(secureUrl),
    format: extensionFromUrl(secureUrl),
    bytes: 0,
    resourceType,
    folder,
    uploadedAt: new Date(0).toISOString(),
  });
}

export function hydrateMediaList(
  assets: readonly MediaAsset[] | undefined,
  urls: readonly unknown[] | undefined,
  resourceType: MediaResourceType,
  folder: string,
): MediaAsset[] {
  const fromAssets = (assets ?? [])
    .map((item) => sanitizeMediaAsset(item))
    .filter((item) => isHttpUrl(item.secureUrl));
  if (fromAssets.length) {
    return fromAssets;
  }
  return (urls ?? [])
    .map((url) => asMediaUrl(url))
    .filter(isHttpUrl)
    .map((url) => assetFromLegacyUrl(url, resourceType, folder));
}

export function urlsFromMedia(assets: readonly MediaAsset[]): string[] {
  return assets.map((item) => asMediaUrl(item.secureUrl)).filter(isHttpUrl);
}

export function featuredAsset(
  assets: readonly MediaAsset[],
  featuredPublicId: string | null | undefined,
): MediaAsset | undefined {
  const valid = assets.filter((item) => isHttpUrl(item.secureUrl));
  if (!valid.length) {
    return undefined;
  }
  return valid.find((item) => item.publicId === featuredPublicId) ?? valid[0];
}

export function hostelCoverUrl(hostel: {
  readonly coverImage?: unknown;
  readonly imageUrls?: readonly unknown[];
  readonly images?: readonly MediaAsset[];
}): string {
  return (
    asMediaUrl(hostel.coverImage) ||
    featuredAsset(hostel.images ?? [], undefined)?.secureUrl ||
    asMediaUrl(hostel.imageUrls?.[0]) ||
    ''
  );
}

export function sanitizeMediaAsset(asset: Partial<MediaAsset> & { readonly secureUrl?: string }): MediaAsset {
  const secureUrl = asMediaUrl(asset.secureUrl);
  return {
    publicId: asset.publicId || publicIdFromUrl(secureUrl) || secureUrl,
    secureUrl,
    originalFileName: asset.originalFileName || fileNameFromUrl(secureUrl),
    format: asset.format || extensionFromUrl(secureUrl),
    bytes: typeof asset.bytes === 'number' ? asset.bytes : 0,
    resourceType: asset.resourceType === 'video' ? 'video' : 'image',
    folder: asset.folder || '',
    uploadedAt: asset.uploadedAt || new Date().toISOString(),
    ...(typeof asset.width === 'number' ? { width: asset.width } : {}),
    ...(typeof asset.height === 'number' ? { height: asset.height } : {}),
    ...(typeof asset.duration === 'number' ? { duration: asset.duration } : {}),
  };
}

export function mediaWriteFields(
  images: readonly MediaAsset[],
  videos: readonly MediaAsset[],
  featuredPublicId?: string | null,
): {
  readonly coverImage: string;
  readonly coverPublicId: string;
  readonly imageUrls: string[];
  readonly videoUrls: string[];
  readonly images: MediaAsset[];
  readonly videos: MediaAsset[];
} {
  const safeImages = images.map((item) => sanitizeMediaAsset(item)).filter((item) => isHttpUrl(item.secureUrl));
  const safeVideos = videos.map((item) => sanitizeMediaAsset(item)).filter((item) => isHttpUrl(item.secureUrl));
  const cover = featuredAsset(safeImages, featuredPublicId);
  return {
    coverImage: cover?.secureUrl ?? '',
    coverPublicId: cover?.publicId ?? '',
    imageUrls: urlsFromMedia(safeImages),
    videoUrls: urlsFromMedia(safeVideos),
    images: safeImages,
    videos: safeVideos,
  };
}

export function logMediaDebug(step: string, detail: Record<string, unknown>): void {
  if (!environment.production) {
    console.info(`[media] ${step}`, detail);
  }
}

function publicIdFromUrl(url: string): string | null {
  const match = url.match(/\/(?:image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return match?.[1] ?? null;
}

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split('/').pop() ?? 'media');
  } catch {
    return 'media';
  }
}

function extensionFromUrl(url: string): string {
  const name = fileNameFromUrl(url);
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}
