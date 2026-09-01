import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Hostel } from '../../../core/models/hostel.model';
import { LocationService } from '../../../core/services/location.service';
import { hostelCoverUrl, optimizeCloudinaryUrl } from '../../../core/utils/cloudinary.util';
import { hostelTypeLabel } from '../../../core/utils/hostel-display.util';

@Component({
  selector: 'app-hostel-card',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './hostel-card.html',
  styleUrl: './hostel-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostelCard {
  private readonly location = inject(LocationService);

  readonly hostel = input.required<Hostel>();
  readonly distanceKm = input<number | null>(null);
  readonly imageFailed = signal(false);
  readonly coverSrc = computed(() =>
    optimizeCloudinaryUrl(hostelCoverUrl(this.hostel()), {
      width: 900,
      height: 640,
    }),
  );
  readonly distanceLabel = computed(() => this.location.formatDistance(this.distanceKm()));
  readonly typeLabel = computed(() => hostelTypeLabel(this.hostel().type));
  readonly extraCount = computed(() => {
    const list = this.hostel().facilities;
    return Array.isArray(list) ? Math.max(0, list.length - 3) : 0;
  });

  constructor() {
    effect(() => {
      this.hostel();
      this.imageFailed.set(false);
    });
  }

  hostelPath(): string[] {
    const hostel = this.hostel();
    return ['/hostels', hostel.slug || hostel.id];
  }

  onImageError(): void {
    this.imageFailed.set(true);
  }

  cardFacilities(): string[] {
    const list = this.hostel().facilities;
    return Array.isArray(list) ? list.slice(0, 3) : [];
  }

  price(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
