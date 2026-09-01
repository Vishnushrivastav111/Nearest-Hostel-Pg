import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MediaAsset } from '../../../core/models/media.model';
import { optimizeCloudinaryUrl } from '../../../core/utils/cloudinary.util';

@Component({
  selector: 'app-media-gallery',
  templateUrl: './media-gallery.html',
  styleUrl: './media-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaGallery {
  readonly images = input<MediaAsset[]>([]);
  readonly videos = input<MediaAsset[]>([]);
  readonly alt = input('Hostel photo');
  readonly index = signal(0);
  readonly lightboxOpen = signal(false);

  readonly current = computed(() => this.images()[this.index()] ?? this.images()[0]);
  readonly heroFailed = signal(false);

  src(asset: MediaAsset | undefined, width = 1400): string {
    return asset ? optimizeCloudinaryUrl(asset.secureUrl, { width, height: 900 }) : '';
  }

  thumb(asset: MediaAsset): string {
    return optimizeCloudinaryUrl(asset.secureUrl, { width: 240, height: 180 });
  }

  select(index: number): void {
    this.index.set(index);
    this.heroFailed.set(false);
  }

  onImageError(): void {
    this.heroFailed.set(true);
  }

  openLightbox(): void {
    if (this.current()) {
      this.lightboxOpen.set(true);
    }
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
  }

  next(): void {
    const total = this.images().length;
    if (!total) {
      return;
    }
    this.index.set((this.index() + 1) % total);
    this.heroFailed.set(false);
  }

  previous(): void {
    const total = this.images().length;
    if (!total) {
      return;
    }
    this.index.set((this.index() - 1 + total) % total);
    this.heroFailed.set(false);
  }
}
