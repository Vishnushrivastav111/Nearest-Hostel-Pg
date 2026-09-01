import { environment } from '../../../environments/environment';

export const CLOUDINARY_FOLDERS = {
  hostels: 'hostel-booking/hostels',
  rooms: 'hostel-booking/rooms',
  videos: 'hostel-booking/videos',
  amenities: 'hostel-booking/amenities',
  profiles: 'hostel-booking/profiles',
} as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];

export const CLOUDINARY_CLOUD_NAME = environment.cloudinary.cloudName;

export const CLOUDINARY_UNSIGNED_PRESETS: Record<CloudinaryFolder, string> = {
  'hostel-booking/hostels': environment.cloudinary.presets.hostels,
  'hostel-booking/rooms': environment.cloudinary.presets.rooms,
  'hostel-booking/videos': environment.cloudinary.presets.videos,
  'hostel-booking/amenities': environment.cloudinary.presets.amenities,
  'hostel-booking/profiles': environment.cloudinary.presets.profiles,
};

export const CLOUDINARY_FUNCTIONS = {
  signUpload: 'signCloudinaryUpload',
  destroyMedia: 'destroyCloudinaryMedia',
} as const;
