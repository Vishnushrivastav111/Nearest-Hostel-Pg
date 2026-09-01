import { v2 as cloudinary } from 'cloudinary';

function numericKeyAndSecret(): { apiKey: string; apiSecret: string; cloudName: string } {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '';
  let apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? '';
  let apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? '';
  // Cloudinary API keys are numeric. Accept swapped env labels from setup notes.
  if (apiKey && apiSecret && !/^\d+$/.test(apiKey) && /^\d+$/.test(apiSecret)) {
    const swappedKey = apiSecret;
    apiSecret = apiKey;
    apiKey = swappedKey;
  }
  return { cloudName, apiKey, apiSecret };
}

export function configureCloudinary(): { cloudName: string; apiKey: string } {
  const { cloudName, apiKey, apiSecret } = numericKeyAndSecret();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables are missing.');
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return { cloudName, apiKey };
}

export function signUpload(params: Record<string, string | number>): string {
  configureCloudinary();
  return cloudinary.utils.api_sign_request(params, cloudinary.config().api_secret as string);
}

export async function destroyMedia(
  publicId: string,
  resourceType: 'image' | 'video',
): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}

export { cloudinary };
