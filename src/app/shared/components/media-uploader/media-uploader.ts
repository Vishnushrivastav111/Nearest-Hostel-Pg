import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MEDIA_LIMITS } from '../../../core/constants/media';
import { CloudinaryFolderName, MediaAsset, MediaResourceType } from '../../../core/models/media.model';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { AppError } from '../../../core/utils/error.util';
import { isCloudinaryUrl, logMediaDebug, optimizeCloudinaryUrl } from '../../../core/utils/cloudinary.util';

interface LocalPreview {
  readonly id: string;
  readonly file: File;
  readonly url: string;
}

@Component({
  selector: 'app-media-uploader',
  imports: [DecimalPipe],
  templateUrl: './media-uploader.html',
  styleUrl: './media-uploader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaUploader {
  private readonly cloudinary = inject(CloudinaryService);
  private readonly seenUploads = new Set<string>();

  readonly kind = input<MediaResourceType>('image');
  readonly folder = input.required<CloudinaryFolderName>();
  readonly multiple = input(true);
  readonly items = input<MediaAsset[]>([]);
  readonly featuredPublicId = input<string | null>(null);
  readonly allowFeatured = input(false);
  readonly disabled = input(false);
  readonly label = input('Upload media');
  readonly hint = input('');

  readonly itemsChange = output<MediaAsset[]>();
  readonly featuredChange = output<string | null>();
  readonly uploadingChange = output<boolean>();

  readonly previews = signal<LocalPreview[]>([]);
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly status = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly dragOver = signal(false);

  readonly accept = computed(() =>
    this.kind() === 'video'
      ? 'video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm'
      : 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
  );
  readonly limit = computed(() =>
    this.kind() === 'video' ? MEDIA_LIMITS.maxVideosPerEntity : MEDIA_LIMITS.maxImagesPerEntity,
  );

  thumb(url: string): string {
    return optimizeCloudinaryUrl(url, { width: 360, height: 240 });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled()) {
      this.dragOver.set(true);
    }
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    void this.addFiles(files);
  }

  onSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  async addFiles(files: File[]): Promise<void> {
    if (this.disabled() || this.uploading() || !files.length) {
      return;
    }
    const remaining = this.limit() - this.items().length;
    if (remaining <= 0) {
      this.error.set(`You can upload up to ${this.limit()} ${this.kind()} files.`);
      return;
    }
    const unique = files.filter((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      return !this.seenUploads.has(key);
    });
    if (!unique.length) {
      this.error.set('That file is already uploading or was already added.');
      return;
    }
    const selected = this.multiple() ? unique.slice(0, remaining) : unique.slice(0, 1);
    logMediaDebug('files-selected', {
      count: selected.length,
      names: selected.map((file) => file.name),
      folder: this.folder(),
    });
    const local = selected.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      url: URL.createObjectURL(file),
    }));
    this.previews.set(local);
    this.error.set(null);
    this.status.set(`Uploading ${selected.length} ${this.kind()}${selected.length > 1 ? 's' : ''}…`);
    this.setUploading(true);
    this.progress.set(1);
    const uploaded: MediaAsset[] = [];
    try {
      for (let index = 0; index < local.length; index += 1) {
        const preview = local[index];
        this.status.set(
          local.length === 1
            ? `Uploading ${this.kind()}…`
            : `Uploading ${index + 1} of ${local.length} ${this.kind()}s…`,
        );
        const asset = await this.uploadWithProgress(preview.file, index, local.length);
        if (asset.secureUrl.startsWith('blob:') || asset.secureUrl.startsWith('data:')) {
          throw new AppError(
            'unavailable',
            'Upload returned a temporary browser URL. The file was not saved.',
          );
        }
        uploaded.push(asset);
        this.seenUploads.add(`${preview.file.name}-${preview.file.size}-${preview.file.lastModified}`);
      }
      const next = this.multiple() ? [...this.items(), ...uploaded] : uploaded;
      this.itemsChange.emit(next);
      if (this.allowFeatured() && !this.featuredPublicId() && next[0]) {
        this.featuredChange.emit(next[0].publicId);
      }
      const usedCloudinary = uploaded.every((item) => isCloudinaryUrl(item.secureUrl));
      this.status.set(
        usedCloudinary
          ? uploaded.length === 1
            ? 'Uploaded to Cloudinary.'
            : `${uploaded.length} files uploaded to Cloudinary.`
          : 'Uploaded and ready to save. Create unsigned Cloudinary presets (nh_hostels, nh_rooms, nh_videos, nh_amenities, nh_profiles) so new files go to Cloudinary folders.',
      );
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Upload failed. Please try again.');
      this.status.set(null);
    } finally {
      this.previews().forEach((item) => URL.revokeObjectURL(item.url));
      this.previews.set([]);
      this.setUploading(false);
    }
  }

  async remove(asset: MediaAsset): Promise<void> {
    if (this.disabled() || this.uploading()) {
      return;
    }
    this.error.set(null);
    try {
      await this.cloudinary.deleteAsset(asset.publicId, asset.resourceType).catch(() => undefined);
      const next = this.items().filter((item) => item.publicId !== asset.publicId);
      this.itemsChange.emit(next);
      if (this.featuredPublicId() === asset.publicId) {
        this.featuredChange.emit(next[0]?.publicId ?? null);
      }
      this.status.set('Media removed.');
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not delete that file.');
    }
  }

  async replace(asset: MediaAsset, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file || this.disabled()) {
      return;
    }
    this.setUploading(true);
    this.progress.set(1);
    this.status.set('Replacing file…');
    this.error.set(null);
    try {
      const nextAsset = await this.uploadWithProgress(file, 0, 1);
      const next = this.items().map((item) => (item.publicId === asset.publicId ? nextAsset : item));
      this.itemsChange.emit(next);
      if (this.featuredPublicId() === asset.publicId) {
        this.featuredChange.emit(nextAsset.publicId);
      }
      await this.cloudinary.deleteAsset(asset.publicId, asset.resourceType).catch(() => undefined);
      this.status.set('Replaced successfully.');
    } catch (error) {
      this.error.set(
        error instanceof AppError ? error.userMessage : 'Replace failed. The original file was kept.',
      );
    } finally {
      this.setUploading(false);
    }
  }

  setFeatured(asset: MediaAsset): void {
    if (this.allowFeatured()) {
      this.featuredChange.emit(asset.publicId);
    }
  }

  private uploadWithProgress(file: File, index: number, total: number): Promise<MediaAsset> {
    return new Promise((resolve, reject) => {
      this.cloudinary.upload(file, this.folder(), this.kind()).subscribe({
        next: (event) => {
          const overall = Math.round(((index + event.progress / 100) / total) * 100);
          this.progress.set(Math.max(1, Math.min(100, overall)));
          if (event.state === 'success' && event.asset) {
            this.progress.set(Math.round(((index + 1) / total) * 100));
            resolve(event.asset);
          }
        },
        error: reject,
      });
    });
  }

  private setUploading(value: boolean): void {
    this.uploading.set(value);
    this.uploadingChange.emit(value);
  }
}
