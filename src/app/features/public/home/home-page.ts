import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AsyncState, errorState, loadingState, successState } from '../../../core/models/common.model';
import { Hostel } from '../../../core/models/hostel.model';
import { GeoPoint } from '../../../core/models/location.model';
import { HostelService } from '../../../core/services/hostel.service';
import { LocationService } from '../../../core/services/location.service';
import { SeoService } from '../../../core/services/seo.service';
import { AppError } from '../../../core/utils/error.util';
import { HostelCard } from '../../../shared/components/hostel-card/hostel-card';

interface NearbyHostel {
  readonly hostel: Hostel;
  readonly distanceKm: number | null;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, HostelCard],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    ngSkipHydration: 'true',
    class: 'home-page',
  },
})
export class HomePage {
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly location = inject(LocationService);

  readonly featured = signal<AsyncState<Hostel[]>>(loadingState<Hostel[]>());
  readonly nearest = signal<AsyncState<NearbyHostel[]>>(loadingState<NearbyHostel[]>());
  readonly locating = signal(true);
  readonly nearbyTitle = signal('Nearest PGs');
  readonly hasPlace = signal(false);
  private origin: GeoPoint | null = null;
  private matchedCity = '';

  constructor() {
    this.seo.set({
      title: 'Find Your Perfect Hostel',
      description:
        'Find nearest PGs automatically, or search by city and area. Request a room and our team will contact you.',
      path: '/',
    });
    afterNextRender(() => {
      void this.loadFeatured();
      void this.useMyLocation(false);
    });
  }

  async loadFeatured(): Promise<void> {
    this.featured.set(loadingState(this.featured().data));
    try {
      const hostelsApi = this.injector.get(HostelService);
      let items: Hostel[] = [];
      try {
        items = (await hostelsApi.listPublished({ isFeatured: true }, { pageSize: 6 })).items;
      } catch {
        items = [];
      }
      if (!items.length) {
        items = (await hostelsApi.listPublished({}, { pageSize: 6 })).items;
      }
      this.featured.set(successState(items));
    } catch (error) {
      const message = error instanceof AppError ? error.userMessage : 'Could not load hostels.';
      this.featured.set(errorState(message, this.featured().data));
    }
  }

  async useMyLocation(force = true): Promise<void> {
    this.locating.set(true);
    this.nearest.set(loadingState(this.nearest().data));
    try {
      const place = await this.location.detect(force);
      this.origin = place.point;
      const hostelsApi = this.injector.get(HostelService);
      const published = await hostelsApi.listPublished({}, { pageSize: 100 });
      const cities = [...new Set(published.items.map((item) => item.city.trim()).filter(Boolean))];
      const matchedCity = this.location.matchCity(place.city, cities);
      let items = published.items;
      if (matchedCity) {
        const inCity = items.filter(
          (item) => item.city.trim().toLowerCase() === matchedCity.toLowerCase(),
        );
        items = inCity.length ? inCity : items;
      }
      const ranked = hostelsApi.rankByDistance(items, place.point).slice(0, 6).map((hostel) => ({
        hostel,
        distanceKm: this.location.hostelDistanceKm(hostel, place.point),
      }));
      this.hasPlace.set(true);
      this.matchedCity = matchedCity ?? '';
      this.nearbyTitle.set(matchedCity ? `Nearest PGs in ${matchedCity}` : 'Nearest PGs near you');
      this.nearest.set(successState(ranked));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not detect your location.';
      this.nearest.set(errorState(message, this.nearest().data));
    } finally {
      this.locating.set(false);
    }
  }

  seeAllNearby(): void {
    const origin = this.origin ?? this.location.lastPoint();
    void this.router.navigate(['/search'], {
      queryParams: {
        near: '1',
        lat: origin?.latitude ?? null,
        lng: origin?.longitude ?? null,
        city: this.matchedCity || null,
      },
    });
  }
}
