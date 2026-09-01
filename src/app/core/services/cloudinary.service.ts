import { Injectable, NgZone, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { lastValueFrom, Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_FUNCTIONS, CLOUDINARY_UNSIGNED_PRESETS } from '../constants/cloudinary';
import { isAdminEmail } from '../constants/admin-emails';
import {
  CloudinarySignRequest,
  MediaAsset,
  MediaResourceType,
} from '../models/media.model';
import { AppError } from '../utils/error.util';
import { logMediaDebug, sanitizeMediaAsset } from '../utils/cloudinary.util';
import { MediaKind, validateMediaFile } from '../utils/media.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { StorageService } from './storage.service';

export interface CloudinaryUploadProgress {
  readonly state: 'signing' | 'running' | 'success' | 'error';
  readonly progress: number;
  readonly asset: MediaAsset | null;
  readonly error: string | null;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly functions = inject(Functions);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly zone = inject(NgZone);

  uploadImage(file: File, folder: CloudinarySignRequest['folder']): Promise<MediaAsset> {
    return this.uploadAndWait(file, folder, 'image');
  }

  uploadMultipleImages(
    files: File[],
    folder: CloudinarySignRequest['folder'],
  ): Promise<MediaAsset[]> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  uploadVideo(file: File, folder: CloudinarySignRequest['folder']): Promise<MediaAsset> {
    return this.uploadAndWait(file, folder, 'video');
  }

  deleteAsset(publicId: string, resourceType: MediaResourceType): Promise<void> {
    return this.destroy(publicId, resourceType);
  }

  upload(
    file: File,
    folder: CloudinarySignRequest['folder'],
    resourceType: MediaResourceType,
  ): Observable<CloudinaryUploadProgress> {
    const kind: MediaKind = resourceType === 'video' ? 'video' : 'image';
    const validation = validateMediaFile(file, kind);
    if (!validation.valid) {
      throw new AppError('invalid-argument', validation.error ?? 'Invalid file.');
    }

    return new Observable<CloudinaryUploadProgress>((subscriber) => {
      const xhr = new XMLHttpRequest();
      let cancelled = false;
      subscriber.next({ state: 'signing', progress: 1, asset: null, error: null });
      logMediaDebug('upload-start', {
        name: file.name,
        type: file.type,
        size: file.size,
        folder,
        resourceType,
      });

      void this.uploadWithFallback(xhr, file, folder, resourceType, (progress) => {
        if (!cancelled) {
          this.zone.run(() => {
            subscriber.next({
              state: 'running',
              progress: Math.max(1, Math.min(99, progress)),
              asset: null,
              error: null,
            });
          });
        }
      })
        .then((asset) => {
          if (cancelled) {
            return;
          }
          logMediaDebug('upload-success', {
            secureUrl: asset.secureUrl,
            publicId: asset.publicId,
            folder,
          });
          this.zone.run(() => {
            subscriber.next({ state: 'success', progress: 100, asset, error: null });
            subscriber.complete();
          });
        })
        .catch((error: unknown) => {
          const mapped = this.errors.toAppError(error);
          logMediaDebug('upload-error', { message: mapped.userMessage, folder });
          this.zone.run(() => {
            subscriber.next({
              state: 'error',
              progress: 0,
              asset: null,
              error: mapped.userMessage,
            });
            subscriber.error(mapped);
          });
        });

      return () => {
        cancelled = true;
        xhr.abort();
      };
    });
  }

  async destroy(publicId: string, resourceType: MediaResourceType): Promise<void> {
    return this.errors.wrap(async () => {
      if (!this.auth.currentUser()) {
        throw new AppError('unauthenticated', 'Please sign in to delete media.');
      }
      try {
        if (
          publicId.startsWith('http') ||
          publicId.startsWith('hostels/') ||
          publicId.startsWith('rooms/') ||
          publicId.startsWith('users/')
        ) {
          await this.storage.deleteByPath(publicId).catch(async () => {
            if (publicId.startsWith('http')) {
              await this.storage.deleteByUrl(publicId);
            }
          });
          return;
        }
        const callable = httpsCallable<
          { publicId: string; resourceType: MediaResourceType },
          { ok: boolean }
        >(this.functions, CLOUDINARY_FUNCTIONS.destroyMedia);
        await callable({ publicId, resourceType });
      } catch {
        // Cloud Functions require Blaze. The listing still drops the media URL.
      }
    });
  }

  private uploadAndWait(
    file: File,
    folder: CloudinarySignRequest['folder'],
    resourceType: MediaResourceType,
  ): Promise<MediaAsset> {
    return lastValueFrom(
      this.upload(file, folder, resourceType).pipe(
        filter((event) => event.state === 'success' && !!event.asset),
        take(1),
      ),
    ).then((event) => {
      if (!event.asset) {
        throw new AppError('unavailable', 'Upload finished without a media URL.');
      }
      return event.asset;
    });
  }

  private async uploadWithFallback(
    xhr: XMLHttpRequest,
    file: File,
    folder: CloudinarySignRequest['folder'],
    resourceType: MediaResourceType,
    onProgress: (progress: number) => void,
  ): Promise<MediaAsset> {
    this.assertCanUpload(folder);
    const preset = CLOUDINARY_UNSIGNED_PRESETS[folder];
    try {
      return await this.sendToCloudinary(
        xhr,
        file,
        folder,
        resourceType,
        { mode: 'unsigned', cloudName: CLOUDINARY_CLOUD_NAME, preset },
        onProgress,
      );
    } catch (cloudinaryError) {
      logMediaDebug('cloudinary-rejected', {
        preset,
        message: cloudinaryError instanceof Error ? cloudinaryError.message : String(cloudinaryError),
      });
      onProgress(20);
      try {
        return await Promise.race([
          this.uploadViaFirebase(file, folder, resourceType, onProgress),
          new Promise<MediaAsset>((_, reject) => {
            setTimeout(() => {
              reject(new AppError('unavailable', 'Backup storage upload timed out.'));
            }, 20000);
          }),
        ]);
      } catch (storageError) {
        throw cloudinaryError instanceof AppError
          ? cloudinaryError
          : this.errors.toAppError(storageError);
      }
    }
  }

  private assertCanUpload(folder: CloudinarySignRequest['folder']): void {
    const user = this.auth.currentUser();
    if (!user) {
      throw new AppError('unauthenticated', 'Please sign in to upload media.');
    }
    if (folder !== 'hostel-booking/profiles' && !isAdminEmail(user.email)) {
      throw new AppError('permission-denied', 'Only admins can manage hostel media.');
    }
  }

  private sendToCloudinary(
    xhr: XMLHttpRequest,
    file: File,
    folder: string,
    resourceType: MediaResourceType,
    target: UnsignedTarget,
    onProgress: (progress: number) => void,
  ): Promise<MediaAsset> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', target.preset);
      let pulse: ReturnType<typeof setInterval> | undefined;
      let lastReported = 0;

      const stopPulse = () => {
        if (pulse) {
          clearInterval(pulse);
          pulse = undefined;
        }
      };

      const report = (value: number) => {
        const next = Math.max(lastReported, Math.min(90, Math.round(value)));
        lastReported = next;
        onProgress(next);
      };

      pulse = setInterval(() => {
        report(lastReported + 6);
      }, 280);

      xhr.upload.onloadstart = () => report(8);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          stopPulse();
          report((event.loaded / event.total) * 90);
        }
      };
      xhr.upload.onload = () => {
        stopPulse();
        onProgress(95);
      };
      xhr.onerror = () => {
        stopPulse();
        reject(new AppError('unavailable', 'Network error. The upload did not finish.'));
      };
      xhr.ontimeout = () => {
        stopPulse();
        reject(new AppError('unavailable', 'Upload timed out. Check your connection and try again.'));
      };
      xhr.onload = () => {
        stopPulse();
        onProgress(98);
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(
            new AppError(
              'unavailable',
              parseCloudinaryError(xhr.responseText) ||
                `Cloudinary upload failed (${xhr.status}). Check upload preset ${target.preset}.`,
            ),
          );
          return;
        }
        const payload = JSON.parse(xhr.responseText) as CloudinaryUploadPayload;
        if (!payload.secure_url) {
          reject(new AppError('unavailable', 'Cloudinary did not return a secure_url.'));
          return;
        }
        onProgress(100);
        resolve(
          sanitizeMediaAsset({
            publicId: payload.public_id,
            secureUrl: payload.secure_url,
            originalFileName: payload.original_filename || file.name,
            format: payload.format ?? '',
            bytes: payload.bytes ?? file.size,
            width: payload.width,
            height: payload.height,
            duration: payload.duration,
            resourceType: payload.resource_type === 'video' ? 'video' : resourceType,
            folder: payload.folder || folder,
            uploadedAt: payload.created_at || new Date().toISOString(),
          }),
        );
      };
      xhr.timeout = 90_000;
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${target.cloudName}/${resourceType}/upload`);
      xhr.send(form);
      report(5);
    });
  }

  private async uploadViaFirebase(
    file: File,
    folder: CloudinarySignRequest['folder'],
    resourceType: MediaResourceType,
    onProgress: (progress: number) => void,
  ): Promise<MediaAsset> {
    const uid = this.auth.currentUser()?.uid ?? 'pending';
    const target =
      folder === 'hostel-booking/videos' || resourceType === 'video'
        ? ({ kind: 'hostel-video', hostelId: uid } as const)
        : folder === 'hostel-booking/rooms'
          ? ({ kind: 'room-image', roomId: uid } as const)
          : folder === 'hostel-booking/profiles'
            ? ({ kind: 'user-avatar', uid } as const)
            : ({ kind: 'hostel-image', hostelId: uid } as const);
    const result = await new Promise<{ downloadUrl: string | null; path: string; progress: number }>(
      (resolve, reject) => {
        this.storage.upload(file, target).subscribe({
          next: (event) => {
            onProgress(event.progress);
            if (event.state === 'success') {
              resolve(event);
            }
          },
          error: reject,
        });
      },
    );
    onProgress(result.progress);
    if (!result.downloadUrl) {
      throw new AppError(
        'unavailable',
        'The file did not finish uploading. Check your connection and try again.',
      );
    }
    return sanitizeMediaAsset({
      publicId: result.path,
      secureUrl: result.downloadUrl,
      originalFileName: file.name,
      format: file.name.split('.').pop()?.toLowerCase() ?? '',
      bytes: file.size,
      resourceType,
      folder,
      uploadedAt: new Date().toISOString(),
    });
  }
}

interface UnsignedTarget {
  readonly mode: 'unsigned';
  readonly cloudName: string;
  readonly preset: string;
}

interface CloudinaryUploadPayload {
  readonly public_id: string;
  readonly secure_url: string;
  readonly format?: string;
  readonly bytes?: number;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly resource_type?: string;
  readonly folder?: string;
  readonly created_at?: string;
  readonly original_filename?: string;
}

function parseCloudinaryError(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    const message = parsed.error?.message ?? null;
    if (message && /preset/i.test(message)) {
      return `Cloudinary upload preset not found. In Cloudinary go to Settings → Upload → Upload presets and create an Unsigned preset named nh_hostels (folder hostel-booking/hostels). Repeat for nh_rooms, nh_videos, nh_amenities, and nh_profiles.`;
    }
    return message;
  } catch {
    return null;
  }
}
