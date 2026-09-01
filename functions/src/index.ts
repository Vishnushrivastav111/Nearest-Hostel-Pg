import { initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { isAdmin, isAllowedFolder } from './admin.js';
import { configureCloudinary, destroyMedia, signUpload } from './cloudinary.js';

initializeApp();

const REGION = 'asia-south1';

interface SignRequest {
  readonly folder?: string;
  readonly resourceType?: 'image' | 'video';
  readonly publicId?: string;
}

interface DestroyRequest {
  readonly publicId?: string;
  readonly resourceType?: 'image' | 'video';
}

export const signCloudinaryUpload = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const auth = request.auth;
    const data = (request.data ?? {}) as SignRequest;
    const folder = data.folder?.trim() ?? '';
    const resourceType = data.resourceType === 'video' ? 'video' : 'image';

    if (!isAllowedFolder(folder)) {
      throw new HttpsError('invalid-argument', 'That Cloudinary folder is not allowed.');
    }
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Please sign in to upload media.');
    }
    if (folder === 'hostel-booking/profiles') {
      if (!auth.uid) {
        throw new HttpsError('unauthenticated', 'Please sign in to upload a profile photo.');
      }
    } else if (!isAdmin(auth)) {
      throw new HttpsError('permission-denied', 'Only admins can manage hostel media.');
    }

    const { cloudName, apiKey } = configureCloudinary();
    const timestamp = Math.round(Date.now() / 1000);
    const params: Record<string, string | number> = { timestamp, folder };
    if (folder === 'hostel-booking/profiles') {
      params.public_id = `${auth.uid}/avatar-${timestamp}`;
    }
    const signature = signUpload(params);
    return {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId: typeof params.public_id === 'string' ? params.public_id : '',
      resourceType,
    };
  },
);

export const destroyCloudinaryMedia = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const auth = request.auth;
    const data = (request.data ?? {}) as DestroyRequest;
    const publicId = data.publicId?.trim() ?? '';
    const resourceType = data.resourceType === 'video' ? 'video' : 'image';

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Please sign in to delete media.');
    }
    if (!publicId) {
      throw new HttpsError('invalid-argument', 'Missing media id.');
    }

    const isProfile = publicId.startsWith('hostel-booking/profiles/');
    if (isProfile) {
      const allowedPrefix = `hostel-booking/profiles/${auth.uid}/`;
      if (!isAdmin(auth) && !publicId.startsWith(allowedPrefix)) {
        throw new HttpsError('permission-denied', 'You can only delete your own profile photo.');
      }
    } else if (!isAdmin(auth)) {
      throw new HttpsError('permission-denied', 'Only admins can delete hostel media.');
    }

    await destroyMedia(publicId, resourceType);
    return { ok: true };
  },
);
