import { AppEnvironment } from './environment.types';
import { FIREBASE_CLIENT_CONFIG } from './firebase-client.config';

/**
 * Default environment. Production and development builds replace this file.
 * The web config is public client configuration, not an Admin SDK secret.
 */
export const environment: AppEnvironment = {
  production: false,
  firebase: FIREBASE_CLIENT_CONFIG,
  cloudinary: {
    cloudName: 'de7oetq23',
    presets: {
      hostels: 'nh_hostels',
      rooms: 'nh_rooms',
      videos: 'nh_videos',
      amenities: 'nh_amenities',
      profiles: 'nh_profiles',
    },
  },
  functionsRegion: 'asia-south1',
  recaptchaSiteKey: '',
  useEmulators: false,
  emulatorHost: '127.0.0.1',
};
