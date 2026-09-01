import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { DetectedPlace, GeoPoint } from '../models/location.model';
import { Hostel } from '../models/hostel.model';

const EARTH_KM = 6371;

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly lastPoint = signal<GeoPoint | null>(null);
  readonly lastPlace = signal<DetectedPlace | null>(null);
  readonly locating = signal(false);
  readonly locationError = signal<string | null>(null);
  private inflight: Promise<DetectedPlace> | null = null;

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  async detect(force = false): Promise<DetectedPlace> {
    if (!this.isBrowser) {
      throw new Error('Location is only available in the browser.');
    }
    if (!force && this.lastPlace()) {
      return this.lastPlace()!;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.locating.set(true);
    this.locationError.set(null);
    this.inflight = this.readPlace();
    try {
      const place = await this.inflight;
      this.lastPoint.set(place.point);
      this.lastPlace.set(place);
      return place;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not detect your location.';
      this.locationError.set(message);
      throw error;
    } finally {
      this.inflight = null;
      this.locating.set(false);
    }
  }

  private async readPlace(): Promise<DetectedPlace> {
    const point = await this.getCurrentPosition();
    return this.reverseGeocode(point);
  }

  getCurrentPosition(): Promise<GeoPoint> {
    return new Promise((resolve, reject) => {
      if (!this.isBrowser || !navigator.geolocation) {
        reject(new Error('Location is not supported on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => reject(new Error(this.messageFor(error))),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 180000 },
      );
    });
  }

  async reverseGeocode(point: GeoPoint): Promise<DetectedPlace> {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${encodeURIComponent(point.latitude)}` +
      `&longitude=${encodeURIComponent(point.longitude)}` +
      `&localityLanguage=en`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Could not identify your city from GPS.');
    }
    const data = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    };
    const city = (data.city || data.locality || '').trim();
    const area = (data.locality && data.locality !== data.city ? data.locality : '').trim();
    const region = (data.principalSubdivision || '').trim();
    const label = [area, city || region].filter(Boolean).join(', ') || 'your location';
    return { city, area, label, point };
  }

  distanceKm(from: GeoPoint, to: GeoPoint): number {
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLng = this.toRad(to.longitude - from.longitude);
    const lat1 = this.toRad(from.latitude);
    const lat2 = this.toRad(to.latitude);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  hostelDistanceKm(hostel: Hostel, origin: GeoPoint): number | null {
    if (hostel.latitude == null || hostel.longitude == null) {
      return null;
    }
    return this.distanceKm(origin, {
      latitude: hostel.latitude,
      longitude: hostel.longitude,
    });
  }

  matchCity(detected: string, cities: string[]): string | null {
    const needle = detected.trim().toLowerCase();
    if (!needle) {
      return null;
    }
    return (
      cities.find((city) => city.toLowerCase() === needle) ??
      cities.find(
        (city) => city.toLowerCase().includes(needle) || needle.includes(city.toLowerCase()),
      ) ??
      null
    );
  }

  matchArea(detected: string, areas: string[]): string | null {
    return this.matchCity(detected, areas);
  }

  formatDistance(km: number | null | undefined): string {
    if (km == null || Number.isNaN(km)) {
      return '';
    }
    if (km < 1) {
      return `${Math.max(50, Math.round(km * 1000))} m`;
    }
    return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private messageFor(error: GeolocationPositionError): string {
    if (error.code === error.PERMISSION_DENIED) {
      return 'Location permission was denied. Search by city instead.';
    }
    if (error.code === error.TIMEOUT) {
      return 'Location request timed out. Try again or search by city.';
    }
    return 'Could not detect your location. Search by city instead.';
  }
}
