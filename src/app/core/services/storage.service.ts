import { Injectable, inject } from '@angular/core';
import { Storage } from '@angular/fire/storage';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Observable } from 'rxjs';
import { STORAGE_PATHS } from '../constants/media';
import { AppError } from '../utils/error.util';
import { MediaKind, uniqueFileName, validateMediaFile } from '../utils/media.util';
import { ErrorHandlerService } from './error-handler.service';
import { FirebaseConfigService } from './firebase-config.service';

export interface UploadProgress {
  readonly state: 'running' | 'success' | 'error';
  readonly progress: number;
  readonly downloadUrl: string | null;
  readonly path: string;
  readonly error: string | null;
}

export type MediaTarget =
  | { readonly kind: 'hostel-cover'; readonly hostelId: string }
  | { readonly kind: 'hostel-image'; readonly hostelId: string }
  | { readonly kind: 'hostel-video'; readonly hostelId: string }
  | { readonly kind: 'room-image'; readonly roomId: string }
  | { readonly kind: 'user-avatar'; readonly uid: string };

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = inject(Storage);
  private readonly errors = inject(ErrorHandlerService);
  private readonly config = inject(FirebaseConfigService);

  upload(file: File, target: MediaTarget): Observable<UploadProgress> {
    const kind: MediaKind = target.kind === 'hostel-video' ? 'video' : 'image';
    const validation = validateMediaFile(file, kind);
    if (!validation.valid) {
      throw new AppError('invalid-argument', validation.error ?? 'Invalid file.');
    }

    this.config.assertConfigured();
    const path = this.pathFor(target, uniqueFileName(file.name));
    const storageRef = ref(this.storage, path);

    return new Observable<UploadProgress>((subscriber) => {
      let cancelled = false;
      subscriber.next({
        state: 'running',
        progress: 20,
        downloadUrl: null,
        path,
        error: null,
      });
      void uploadBytes(storageRef, file, {
        contentType: file.type || contentTypeFromName(file.name, kind),
      })
        .then(async (snapshot) => {
          if (cancelled) {
            return;
          }
          subscriber.next({
            state: 'running',
            progress: 80,
            downloadUrl: null,
            path,
            error: null,
          });
          const downloadUrl = await getDownloadURL(snapshot.ref);
          if (cancelled) {
            return;
          }
          subscriber.next({
            state: 'success',
            progress: 100,
            downloadUrl,
            path,
            error: null,
          });
          subscriber.complete();
        })
        .catch((error: unknown) => {
          const mapped = this.errors.toAppError(error);
          subscriber.next({
            state: 'error',
            progress: 0,
            downloadUrl: null,
            path,
            error: mapped.userMessage,
          });
          subscriber.error(mapped);
        });

      return () => {
        cancelled = true;
      };
    });
  }

  uploadImage(file: File, target: Exclude<MediaTarget, { kind: 'hostel-video' }>): Observable<UploadProgress> {
    return this.upload(file, target);
  }

  uploadVideo(file: File, hostelId: string): Observable<UploadProgress> {
    return this.upload(file, { kind: 'hostel-video', hostelId });
  }

  getDownloadUrl(path: string): Promise<string> {
    return this.errors.wrap(async () => {
      this.config.assertConfigured();
      return getDownloadURL(ref(this.storage, path));
    });
  }

  async deleteByUrl(downloadUrl: string): Promise<void> {
    return this.errors.wrap(async () => {
      this.config.assertConfigured();
      const fileRef = ref(this.storage, downloadUrl);
      await deleteObject(fileRef);
    });
  }

  async deleteByPath(path: string): Promise<void> {
    return this.errors.wrap(async () => {
      this.config.assertConfigured();
      await deleteObject(ref(this.storage, path));
    });
  }

  private pathFor(target: MediaTarget, fileName: string): string {
    switch (target.kind) {
      case 'hostel-cover':
        return STORAGE_PATHS.hostelCover(target.hostelId, fileName);
      case 'hostel-image':
        return STORAGE_PATHS.hostelImage(target.hostelId, fileName);
      case 'hostel-video':
        return STORAGE_PATHS.hostelVideo(target.hostelId, fileName);
      case 'room-image':
        return STORAGE_PATHS.roomImage(target.roomId, fileName);
      case 'user-avatar':
        return STORAGE_PATHS.userAvatar(target.uid, fileName);
    }
  }
}

function contentTypeFromName(fileName: string, kind: MediaKind): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (kind === 'video') {
    if (ext === 'webm') {
      return 'video/webm';
    }
    if (ext === 'mov') {
      return 'video/quicktime';
    }
    return 'video/mp4';
  }
  if (ext === 'png') {
    return 'image/png';
  }
  if (ext === 'webp') {
    return 'image/webp';
  }
  return 'image/jpeg';
}
