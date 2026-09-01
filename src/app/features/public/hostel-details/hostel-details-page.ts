import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Hostel } from '../../../core/models/hostel.model';
import { Room } from '../../../core/models/room.model';
import { HostelService } from '../../../core/services/hostel.service';
import { ReviewService } from '../../../core/services/review.service';
import { RoomService } from '../../../core/services/room.service';
import { SeoService } from '../../../core/services/seo.service';
import { AppError } from '../../../core/utils/error.util';
import { RequestRoom } from '../../../shared/components/request-room/request-room';
import { MediaGallery } from '../../../shared/components/media-gallery/media-gallery';
import { Review } from '../../../core/models/review.model';
import { Facility } from '../../../core/models/facility.model';
import { MediaAsset } from '../../../core/models/media.model';
import { CLOUDINARY_FOLDERS } from '../../../core/constants/cloudinary';
import { hydrateMediaList, asMediaUrl, optimizeCloudinaryUrl } from '../../../core/utils/cloudinary.util';
import { hostelTypeLabel, sharingLabel as toSharingLabel } from '../../../core/utils/hostel-display.util';
import { FacilityService } from '../../../core/services/facility.service';

@Component({
  selector: 'app-hostel-details-page',
  imports: [RouterLink, RequestRoom, MediaGallery, DecimalPipe],
  templateUrl: './hostel-details-page.html',
  styleUrl: './hostel-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostelDetailsPage implements OnDestroy {
  private readonly hostelsApi = inject(HostelService);
  private readonly roomsApi = inject(RoomService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly facilitiesApi = inject(FacilityService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hostel = signal<Hostel | null>(null);
  readonly rooms = signal<Room[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly requestOpen = signal(false);
  readonly selectedRoomId = signal<string | null>(null);
  readonly amenities = signal<Facility[]>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  ngOnDestroy(): void {
    this.seo.setJsonLd(null);
  }

  typeLabel(type: string): string {
    return hostelTypeLabel(type);
  }

  sharingLabel(type: string): string {
    return toSharingLabel(type);
  }

  price(value: number | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return 'Price on request';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  galleryImages(): MediaAsset[] {
    const hostel = this.hostel();
    if (!hostel) {
      return [];
    }
    const images = hydrateMediaList(hostel.images, hostel.imageUrls, 'image', CLOUDINARY_FOLDERS.hostels);
    const cover = asMediaUrl(hostel.coverImage);
    if (cover && !images.some((item) => item.secureUrl === cover)) {
      images.unshift(
        hydrateMediaList(undefined, [cover], 'image', CLOUDINARY_FOLDERS.hostels)[0],
      );
    }
    const featured = hostel.coverPublicId;
    return [...images].sort((left, right) => {
      if (left.publicId === featured) {
        return -1;
      }
      if (right.publicId === featured) {
        return 1;
      }
      return 0;
    });
  }

  galleryVideos(): MediaAsset[] {
    const hostel = this.hostel();
    if (!hostel) {
      return [];
    }
    return hydrateMediaList(hostel.videos, hostel.videoUrls, 'video', CLOUDINARY_FOLDERS.videos);
  }

  roomImages(room: Room): MediaAsset[] {
    return hydrateMediaList(room.images, room.imageUrls, 'image', CLOUDINARY_FOLDERS.rooms);
  }

  amenityFor(name: string): Facility | undefined {
    return this.amenities().find((item) => item.name.toLowerCase() === name.toLowerCase());
  }

  amenitySrc(name: string): string | null {
    const amenity = this.amenityFor(name);
    const url = amenity?.image?.secureUrl || amenity?.imageUrl;
    return url ? optimizeCloudinaryUrl(url, { width: 96, height: 96 }) : null;
  }

  openRequest(roomId?: string): void {
    this.selectedRoomId.set(roomId ?? null);
    this.requestOpen.set(true);
  }

  async load(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error.set('Hostel not found.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const hostel = await this.hostelsApi.getBySlug(slug);
      if (!hostel || hostel.status !== 'published' || !hostel.isActive || hostel.isDeleted) {
        this.hostel.set(null);
        this.error.set('This hostel is not available.');
        this.seo.set({
          title: 'Hostel not available',
          description: 'This listing is not published.',
          path: `/hostels/${slug}`,
          noIndex: true,
        });
        return;
      }
      this.hostel.set(hostel);
      const [rooms, reviews, amenities] = await Promise.all([
        this.roomsApi.listByHostel(hostel.id, true).catch(() => [] as Room[]),
        this.reviewsApi.getApprovedReviews(hostel.id).catch(() => [] as Review[]),
        this.facilitiesApi.listActive().catch(() => [] as Facility[]),
      ]);
      this.rooms.set(rooms.filter((room) => room.isActive && !room.isDeleted));
      this.reviews.set(reviews);
      this.amenities.set(amenities);
      const cover = this.galleryImages()[0]?.secureUrl || hostel.coverImage;
      const description =
        hostel.seo?.description ||
        hostel.description?.slice(0, 160) ||
        `Rooms in ${hostel.area}, ${hostel.city}.`;
      this.seo.set({
        title: hostel.seo?.title || hostel.name,
        description,
        path: `/hostels/${hostel.slug || hostel.id}`,
        image: cover,
      });
      this.seo.setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        name: hostel.name,
        description,
        address: {
          '@type': 'PostalAddress',
          streetAddress: hostel.address,
          addressLocality: hostel.city,
          addressRegion: hostel.state,
          postalCode: hostel.pincode,
        },
        image: cover,
      });
      if (this.route.snapshot.queryParamMap.get('request') === '1') {
        this.requestOpen.set(true);
      }
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load this hostel.');
    } finally {
      this.loading.set(false);
    }
  }
}
