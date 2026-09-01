import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { AsyncState, errorState, loadingState, successState } from '../../../core/models/common.model';
import { Hostel, HostelListFilters } from '../../../core/models/hostel.model';
import { GeoPoint } from '../../../core/models/location.model';
import { HostelService } from '../../../core/services/hostel.service';
import { LocationService } from '../../../core/services/location.service';
import { SeoService } from '../../../core/services/seo.service';
import { AppError } from '../../../core/utils/error.util';
import { HostelCard } from '../../../shared/components/hostel-card/hostel-card';

interface ListedHostel {
  readonly hostel: Hostel;
  readonly distanceKm: number | null;
}

@Component({
  selector: 'app-hostel-list-page',
  imports: [HostelCard],
  templateUrl: './hostel-list-page.html',
  styleUrl: './hostel-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: 'true' },
})
export class HostelListPage {
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly location = inject(LocationService);

  readonly state = signal<AsyncState<ListedHostel[]>>(loadingState<ListedHostel[]>());
  readonly emptyMessage = signal('No hostels match this search. Try another city or area.');
  readonly title = signal('Hostels');
  readonly subtitle = signal('Published listings with photos, rooms, and pricing.');
  readonly eyebrow = signal('Browse');
  readonly chips = signal<string[]>([]);

  private city = '';
  private area = '';
  private type = '';
  private maxPrice = '';
  private sharingType = '';
  private verifiedOnly = false;
  private near = false;
  private origin: GeoPoint | null = null;

  constructor() {
    this.seo.set({
      title: 'Hostels',
      description: 'Search published hostels and PGs by city, area, and distance.',
      path: '/hostels',
    });
    afterNextRender(() => {
      this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
        this.applyParams(params);
        if (this.near && !this.origin) {
          void this.useMyLocation();
          return;
        }
        void this.load();
      });
    });
  }

  count(): number | null {
    const state = this.state();
    if (state.loading || state.error || !state.data) {
      return null;
    }
    return state.data.length;
  }

  async useMyLocation(): Promise<void> {
    this.state.set(loadingState(this.state().data));
    try {
      const place = await this.location.detect(true);
      await this.router.navigate(['/search'], {
        queryParams: {
          city: this.city || null,
          area: this.area || null,
          type: this.type || null,
          maxPrice: this.maxPrice || null,
          sharingType: this.sharingType || null,
          near: '1',
          lat: place.point.latitude,
          lng: place.point.longitude,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not detect your location.';
      this.state.set(errorState(message, this.state().data));
    }
  }

  async load(): Promise<void> {
    this.state.set(loadingState(this.state().data));
    this.emptyMessage.set(this.messageForLocation(this.city, this.area));
    this.updateCopy();
    const query: HostelListFilters = {
      city: this.city || undefined,
      area: this.area || undefined,
      type: this.type ? (this.type as HostelListFilters['type']) : undefined,
      maxPrice: this.maxPrice ? Number(this.maxPrice) : undefined,
      sharingType: this.sharingType || undefined,
      isVerified: this.verifiedOnly || undefined,
    };
    try {
      const hostelsApi = this.injector.get(HostelService);
      let items = (await hostelsApi.listPublished(query)).items;
      if (this.origin) {
        items = hostelsApi.rankByDistance(items, this.origin);
      }
      const listed = items.map((hostel) => ({
        hostel,
        distanceKm: this.origin ? this.location.hostelDistanceKm(hostel, this.origin) : null,
      }));
      this.subtitle.set(
        this.city
          ? `Verified PGs${this.area ? ` in ${this.area}` : ''} with photos and starting prices.`
          : 'Verified photos, rooms, and starting prices.',
      );
      this.state.set(successState(listed));
    } catch (error) {
      const message = error instanceof AppError ? error.userMessage : 'Could not load hostels.';
      this.state.set(errorState(message, this.state().data));
    }
  }

  private applyParams(params: ParamMap): void {
    this.city = params.get('city') ?? '';
    this.area = params.get('area') ?? '';
    this.type = params.get('type') ?? '';
    this.maxPrice = params.get('maxPrice') ?? '';
    this.sharingType = params.get('sharingType') ?? '';
    this.verifiedOnly = params.get('verifiedOnly') === '1';
    this.near = params.get('near') === '1';
    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    this.origin =
      Number.isFinite(lat) && Number.isFinite(lng) && params.get('lat') && params.get('lng')
        ? { latitude: lat, longitude: lng }
        : this.near
          ? this.location.lastPoint()
          : null;
  }

  private updateCopy(): void {
    const chips = [
      this.city,
      this.area,
      this.type,
      this.maxPrice ? `Under ₹${Number(this.maxPrice).toLocaleString('en-IN')}` : '',
      this.sharingType,
      this.near ? 'Nearest first' : '',
    ].filter(Boolean);
    this.chips.set(chips);
    if (this.near) {
      this.eyebrow.set('Near you');
      this.title.set(this.city ? `Nearest PGs in ${this.city}` : 'Nearest PGs');
      return;
    }
    if (this.city && this.area) {
      this.eyebrow.set('Search results');
      this.title.set(`PGs in ${this.area}, ${this.city}`);
      return;
    }
    if (this.city) {
      this.eyebrow.set('Search results');
      this.title.set(`PGs in ${this.city}`);
      return;
    }
    this.eyebrow.set('Browse');
    this.title.set('All hostels');
  }

  private messageForLocation(cityValue: string, areaValue: string): string {
    const city = cityValue.trim();
    const area = areaValue.trim();
    if (city && area) {
      return `No hostels are available in ${area}, ${city}. Try another area or city.`;
    }
    if (city) {
      return `No hostels are available in ${city}. Try another location.`;
    }
    if (area) {
      return `No hostels are available in ${area}. Try another area.`;
    }
    return 'No hostels match this search. Try another city, or check back after listings are published.';
  }
}
