import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

function loadEnvFile(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq < 1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // functions/.env is optional when vars are already in the environment.
  }
}

loadEnvFile();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
let apiKey = process.env.CLOUDINARY_API_KEY ?? '';
let apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';
if (!/^\d+$/.test(apiKey) && /^\d+$/.test(apiSecret)) {
  const swapped = apiSecret;
  apiSecret = apiKey;
  apiKey = swapped;
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

const presets = [
  { name: 'nh_hostels', folder: 'hostel-booking/hostels', resource: 'image' },
  { name: 'nh_rooms', folder: 'hostel-booking/rooms', resource: 'image' },
  { name: 'nh_videos', folder: 'hostel-booking/videos', resource: 'video' },
  { name: 'nh_amenities', folder: 'hostel-booking/amenities', resource: 'image' },
  { name: 'nh_profiles', folder: 'hostel-booking/profiles', resource: 'image' },
] as const;

async function ensurePreset(preset: (typeof presets)[number]): Promise<void> {
  try {
    await cloudinary.api.upload_preset(preset.name);
    console.log(`preset exists: ${preset.name}`);
    return;
  } catch {
    await cloudinary.api.create_upload_preset({
      name: preset.name,
      unsigned: true,
      folder: preset.folder,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      allowed_formats: preset.resource === 'video' ? 'mp4,mov,webm' : 'jpg,jpeg,png,webp',
    });
    console.log(`preset created: ${preset.name} -> ${preset.folder}`);
  }
}

async function main(): Promise<void> {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in functions/.env');
  }
  for (const preset of presets) {
    await ensurePreset(preset);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
