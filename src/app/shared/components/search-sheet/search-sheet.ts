import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { HOSTEL_TYPES } from '../../../core/models/hostel.model';
import { PlaceCatalog } from '../../../core/models/location.model';
import { SHARING_TYPES } from '../../../core/models/room.model';
import { HostelService } from '../../../core/services/hostel.service';
import { LocationService } from '../../../core/services/location.service';
import { SearchDraft, SearchUiService } from '../../../core/services/search-ui.service';

type SearchStep = 'city' | 'area' | 'filters';

@Component({
  selector: 'app-search-sheet',
  templateUrl: './search-sheet.html',
  styleUrl: './search-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchSheet {
  private readonly searchUi = inject(SearchUiService);
  private readonly hostelsApi = inject(HostelService);
  private readonly location = inject(LocationService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly types = HOSTEL_TYPES;
  readonly sharingTypes = SHARING_TYPES;
  readonly budgets = [
    { value: '', label: 'Any budget' },
    { value: '5000', label: 'Under ₹5,000' },
    { value: '8000', label: 'Under ₹8,000' },
    { value: '12000', label: 'Under ₹12,000' },
    { value: '20000', label: 'Under ₹20,000' },
  ];

  readonly step = signal<SearchStep>('city');
  readonly city = signal('');
  readonly area = signal('');
  readonly type = signal('');
  readonly maxPrice = signal('');
  readonly sharingType = signal('');
  readonly catalog = signal<PlaceCatalog>({ cities: [], areasByCity: {} });
  readonly loadingPlaces = signal(true);
  readonly locating = signal(false);
  readonly error = signal<string | null>(null);
  readonly cityQuery = signal('');

  constructor() {
    const draft = this.searchUi.draft();
    this.city.set(draft.city);
    this.area.set(draft.area);
    this.type.set(draft.type);
    this.maxPrice.set(draft.maxPrice);
    this.sharingType.set(draft.sharingType);
    if (draft.city) {
      this.step.set(draft.area ? 'filters' : 'area');
    }
    if (isPlatformBrowser(this.platformId)) {
      void this.loadPlaces();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  onCityQuery(event: Event): void {
    this.cityQuery.set((event.target as HTMLInputElement).value);
  }

  cities(): string[] {
    const query = this.cityQuery().trim().toLowerCase();
    const cities = this.catalog().cities;
    if (!query) {
      return cities;
    }
    return cities.filter((city) => city.toLowerCase().includes(query));
  }

  areas(): string[] {
    return this.catalog().areasByCity[this.city()] ?? [];
  }

  typeLabel(type: string): string {
    if (type === 'co-living') {
      return 'Co-living';
    }
    return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)} PG` : 'Any type';
  }

  sharingLabel(type: string): string {
    if (!type) {
      return 'Any sharing';
    }
    if (type === 'other') {
      return 'Other';
    }
    return `${type.charAt(0).toUpperCase()}${type.slice(1)} sharing`;
  }

  close(): void {
    this.searchUi.hide();
  }

  back(): void {
    if (this.step() === 'filters') {
      this.step.set('area');
      return;
    }
    if (this.step() === 'area') {
      this.step.set('city');
      this.area.set('');
      return;
    }
    this.close();
  }

  pickCity(city: string): void {
    this.city.set(city);
    this.area.set('');
    this.step.set('area');
  }

  pickArea(area: string): void {
    this.area.set(area);
    this.step.set('filters');
  }

  pickType(type: string): void {
    this.type.set(this.type() === type ? '' : type);
  }

  pickBudget(value: string): void {
    this.maxPrice.set(value);
  }

  pickSharing(type: string): void {
    this.sharingType.set(this.sharingType() === type ? '' : type);
  }

  async useMyLocation(): Promise<void> {
    this.locating.set(true);
    this.error.set(null);
    try {
      const place = await this.location.detect(true);
      const cities = this.catalog().cities;
      const matchedCity = this.location.matchCity(place.city, cities);
      const areas = matchedCity ? (this.catalog().areasByCity[matchedCity] ?? []) : [];
      const matchedArea = this.location.matchArea(place.area, areas);
      await this.navigate({
        city: matchedCity ?? '',
        area: matchedArea ?? '',
        type: this.type(),
        maxPrice: this.maxPrice(),
        sharingType: this.sharingType(),
      }, {
        near: true,
        lat: place.point.latitude,
        lng: place.point.longitude,
      });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not use your location.');
    } finally {
      this.locating.set(false);
    }
  }

  submit(): void {
    if (!this.city() && this.step() !== 'filters') {
      this.error.set('Please select a city to continue.');
      return;
    }
    void this.navigate({
      city: this.city(),
      area: this.area(),
      type: this.type(),
      maxPrice: this.maxPrice(),
      sharingType: this.sharingType(),
    });
  }

  private async loadPlaces(): Promise<void> {
    this.loadingPlaces.set(true);
    try {
      this.catalog.set(await this.hostelsApi.listPublishedPlaces());
    } catch {
      this.error.set('Could not load cities. Pull to retry, or search nearby.');
    } finally {
      this.loadingPlaces.set(false);
    }
  }

  private async navigate(
    draft: SearchDraft,
    extra: { near?: boolean; lat?: number; lng?: number } = {},
  ): Promise<void> {
    this.searchUi.hide();
    await this.router.navigate(['/search'], {
      queryParams: {
        city: draft.city || null,
        area: draft.area || null,
        type: draft.type || null,
        maxPrice: draft.maxPrice || null,
        sharingType: draft.sharingType || null,
        near: extra.near ? '1' : null,
        lat: extra.lat ?? null,
        lng: extra.lng ?? null,
      },
    });
  }
}
