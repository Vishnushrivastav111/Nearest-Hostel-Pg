import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { CLOUDINARY_FOLDERS } from '../../../core/constants/cloudinary';
import { DEFAULT_FACILITY_NAMES, Facility } from '../../../core/models/facility.model';
import { MediaAsset } from '../../../core/models/media.model';
import { FacilityService } from '../../../core/services/facility.service';
import { AppError } from '../../../core/utils/error.util';
import { slugify } from '../../../core/utils/slug.util';
import { MediaUploader } from '../../../shared/components/media-uploader/media-uploader';

@Component({
  selector: 'app-admin-amenities-page',
  imports: [MediaUploader],
  templateUrl: './admin-amenities-page.html',
  styleUrl: './admin-amenities-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAmenitiesPage {
  private readonly facilitiesApi = inject(FacilityService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly folders = CLOUDINARY_FOLDERS;
  readonly items = signal<Facility[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loading = signal(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  imagesFor(item: Facility): MediaAsset[] {
    if (item.image) {
      return [item.image];
    }
    if (item.imageUrl) {
      return [
        {
          publicId: item.imageUrl,
          secureUrl: item.imageUrl,
          originalFileName: item.name,
          format: '',
          bytes: 0,
          resourceType: 'image',
          folder: CLOUDINARY_FOLDERS.amenities,
          uploadedAt: new Date(0).toISOString(),
        },
      ];
    }
    return [];
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      let items = await this.facilitiesApi.listAll().catch(async () => this.facilitiesApi.listActive());
      const existing = new Set(items.map((item) => item.name.toLowerCase()));
      for (const [index, name] of DEFAULT_FACILITY_NAMES.entries()) {
        if (!existing.has(name.toLowerCase())) {
          await this.facilitiesApi.create({
            name,
            slug: slugify(name),
            isActive: true,
            sortOrder: index + 1,
          });
        }
      }
      items = await this.facilitiesApi.listAll().catch(async () => this.facilitiesApi.listActive());
      this.items.set(items);
      this.notice.set(null);
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load amenities.');
    } finally {
      this.loading.set(false);
    }
  }

  async saveImage(item: Facility, assets: MediaAsset[]): Promise<void> {
    const image = assets[0];
    try {
      await this.facilitiesApi.update(item.id, {
        image,
        imageUrl: image?.secureUrl,
      });
      this.notice.set(`${item.name} image saved.`);
      await this.load();
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not save amenity image.');
    }
  }
}
