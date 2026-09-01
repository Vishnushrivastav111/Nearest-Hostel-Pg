import { Injectable, inject } from '@angular/core';
import {
  QueryConstraint,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { COLLECTIONS } from '../constants/collections';
import { PAGINATION } from '../constants/app.constants';
import { PageRequest, PageResult } from '../models/common.model';
import { Hostel, HostelListFilters, HostelStatus, HostelWriteInput } from '../models/hostel.model';
import { GeoPoint, PlaceCatalog } from '../models/location.model';
import { LocationService } from './location.service';
import { slugify } from '../utils/slug.util';
import { omitUndefined } from '../utils/firestore.util';
import { AppError } from '../utils/error.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class HostelService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);
  private readonly location = inject(LocationService);

  getById(id: string): Promise<Hostel | null> {
    return this.errors.wrap(() => this.firestore.getById<Hostel>(COLLECTIONS.hostels, id));
  }

  getHostelById(id: string): Promise<Hostel | null> {
    return this.getById(id);
  }

  getHostelBySlug(slug: string): Promise<Hostel | null> {
    return this.getBySlug(slug);
  }

  getPublishedHostels(filters: HostelListFilters = {}, page?: PageRequest): Promise<PageResult<Hostel>> {
    return this.listPublished(filters, page);
  }

  getAllHostelsForAdmin(filters: HostelListFilters = {}, page?: PageRequest): Promise<PageResult<Hostel>> {
    return this.listAdmin(filters, page);
  }

  watchById(id: string): Observable<Hostel | null> {
    return this.firestore.watchById<Hostel>(COLLECTIONS.hostels, id);
  }

  async getBySlug(slug: string): Promise<Hostel | null> {
    return this.errors.wrap(async () => {
      try {
        const byId = await this.firestore.getById<Hostel>(COLLECTIONS.hostels, slug);
        if (byId && !byId.isDeleted) {
          return byId;
        }
      } catch {
        // Slug URLs are not document ids; continue with the slug query.
      }
      try {
        const matches = await this.firestore.getDocs<Hostel>(
          COLLECTIONS.hostels,
          where('slug', '==', slug),
          where('status', '==', 'published'),
          where('isActive', '==', true),
          where('isDeleted', '==', false),
        );
        if (matches[0]) {
          return matches[0];
        }
      } catch {
        // Missing composite index: fall back to the published list.
      }
      const published = await this.listPublished({}, { pageSize: 100 });
      return published.items.find((item) => item.slug === slug || item.id === slug) ?? null;
    });
  }

  async listPublishedPlaces(): Promise<PlaceCatalog> {
    const page = await this.listPublished({}, { pageSize: 100 });
    const areasByCity: Record<string, string[]> = {};
    for (const hostel of page.items) {
      const city = hostel.city.trim();
      const area = hostel.area.trim();
      if (!city) {
        continue;
      }
      const areas = areasByCity[city] ?? [];
      if (area && !areas.some((item) => item.toLowerCase() === area.toLowerCase())) {
        areas.push(area);
      }
      areasByCity[city] = areas;
    }
    const cities = Object.keys(areasByCity).sort((left, right) => left.localeCompare(right));
    for (const city of cities) {
      areasByCity[city] = areasByCity[city].sort((left, right) => left.localeCompare(right));
    }
    return { cities, areasByCity };
  }

  rankByDistance(items: Hostel[], origin: GeoPoint): Hostel[] {
    return [...items].sort((left, right) => {
      const leftKm = this.location.hostelDistanceKm(left, origin);
      const rightKm = this.location.hostelDistanceKm(right, origin);
      return (leftKm ?? Number.POSITIVE_INFINITY) - (rightKm ?? Number.POSITIVE_INFINITY);
    });
  }

  listPublished(filters: HostelListFilters = {}, page?: PageRequest): Promise<PageResult<Hostel>> {
    return this.errors.wrap(async () => {
      const constraints = this.publishedConstraints();
      const result = await this.firestore.getPage<Hostel>(
        COLLECTIONS.hostels,
        Math.max(page?.pageSize ?? PAGINATION.publicPageSize, 50),
        page?.cursor,
        constraints,
      );
      const items = this.applyClientFilters(result.items, filters).sort((left, right) => {
        const leftTime = toMillis(left.createdAt);
        const rightTime = toMillis(right.createdAt);
        return rightTime - leftTime;
      });
      return {
        ...result,
        items,
        hasMore: false,
        nextCursor: null,
      };
    });
  }

  listAdmin(filters: HostelListFilters = {}, page?: PageRequest): Promise<PageResult<Hostel>> {
    return this.errors.wrap(async () => {
      const constraints: QueryConstraint[] = [where('isDeleted', '==', false)];
      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters.city) {
        constraints.push(where('city', '==', filters.city));
      }
      if (filters.type) {
        constraints.push(where('type', '==', filters.type));
      }
      if (filters.isFeatured !== undefined) {
        constraints.push(where('isFeatured', '==', filters.isFeatured));
      }
      if (filters.isVerified !== undefined) {
        constraints.push(where('isVerified', '==', filters.isVerified));
      }

      const result = await this.firestore.getPage<Hostel>(
        COLLECTIONS.hostels,
        page?.pageSize ?? 50,
        page?.cursor,
        constraints,
      );
      const items = this.applyClientFilters(result.items, filters).sort((left, right) => {
        return toMillis(right.createdAt) - toMillis(left.createdAt);
      });
      return {
        ...result,
        items,
        hasMore: false,
        nextCursor: null,
      };
    });
  }

  createHostel(input: HostelWriteInput): Promise<string> {
    return this.create(input);
  }

  updateHostel(id: string, input: Partial<HostelWriteInput>): Promise<void> {
    return this.update(id, input);
  }

  publishHostel(id: string): Promise<void> {
    return this.setStatus(id, 'published');
  }

  unpublishHostel(id: string): Promise<void> {
    return this.setStatus(id, 'unpublished', false);
  }

  deactivateHostel(id: string): Promise<void> {
    return this.softDelete(id);
  }

  async create(input: HostelWriteInput): Promise<string> {
    return this.errors.wrap(async () => {
      const uid = this.auth.currentUser()?.uid;
      const ref = this.firestore.newDocRef(COLLECTIONS.hostels);
      const slug = await this.ensureUniqueSlug(input.slug || slugify(input.name));
      await setDoc(
        ref,
        omitUndefined({
          ...input,
          slug,
          name: input.name.trim(),
          nameLower: input.name.trim().toLowerCase(),
          city: input.city.trim(),
          cityLower: input.city.trim().toLowerCase(),
          area: input.area.trim(),
          areaLower: input.area.trim().toLowerCase(),
          isDeleted: false,
          isActive: input.status === 'published' ? true : input.isActive,
          rating: 0,
          reviewCount: 0,
          ...this.firestore.auditFields(uid),
        }),
      );
      return ref.id;
    });
  }

  async update(id: string, input: Partial<HostelWriteInput>): Promise<void> {
    return this.errors.wrap(async () => {
      const uid = this.auth.currentUser()?.uid;
      const patch = omitUndefined({
        ...input,
        nameLower: input.name ? input.name.trim().toLowerCase() : undefined,
        cityLower: input.city ? input.city.trim().toLowerCase() : undefined,
        areaLower: input.area ? input.area.trim().toLowerCase() : undefined,
        ...this.firestore.touchFields(uid),
      });
      await updateDoc(this.firestore.docRef(COLLECTIONS.hostels, id), patch);
    });
  }

  async setStatus(id: string, status: HostelStatus, isActive = status === 'published'): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.hostels, id), {
        status,
        isActive: status === 'published' ? true : isActive,
        isDeleted: false,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }

  async setFeatured(id: string, isFeatured: boolean): Promise<void> {
    return this.updateFlags(id, { isFeatured });
  }

  async setVerified(id: string, isVerified: boolean): Promise<void> {
    return this.updateFlags(id, { isVerified });
  }

  async softDelete(id: string): Promise<void> {
    return this.errors.wrap(async () => {
      const uid = this.auth.currentUser()?.uid;
      await updateDoc(this.firestore.docRef(COLLECTIONS.hostels, id), {
        isDeleted: true,
        isActive: false,
        status: 'unpublished',
        deletedAt: serverTimestamp(),
        deletedBy: uid,
        ...this.firestore.touchFields(uid),
      });
    });
  }

  async updateStartingPrice(id: string, startingPrice: number): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.hostels, id), {
        startingPrice,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }

  private async updateFlags(id: string, flags: Partial<Pick<Hostel, 'isFeatured' | 'isVerified'>>): Promise<void> {
    await updateDoc(this.firestore.docRef(COLLECTIONS.hostels, id), {
      ...flags,
      ...this.firestore.touchFields(this.auth.currentUser()?.uid),
    });
  }

  private publishedConstraints(): QueryConstraint[] {
    return [
      where('status', '==', 'published'),
      where('isActive', '==', true),
      where('isDeleted', '==', false),
    ];
  }

  private applyClientFilters(items: Hostel[], filters: HostelListFilters): Hostel[] {
    return items.filter((hostel) => {
      if (filters.city && hostel.city.trim().toLowerCase() !== filters.city.trim().toLowerCase()) {
        return false;
      }
      if (filters.area && hostel.area.trim().toLowerCase() !== filters.area.trim().toLowerCase()) {
        return false;
      }
      if (filters.type && hostel.type !== filters.type) {
        return false;
      }
      if (filters.isFeatured && !hostel.isFeatured) {
        return false;
      }
      if (filters.isVerified && !hostel.isVerified) {
        return false;
      }
      if (filters.minPrice !== undefined && hostel.startingPrice < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && hostel.startingPrice > filters.maxPrice) {
        return false;
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const haystack = `${hostel.name} ${hostel.area} ${hostel.city}`.toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      if (filters.facilities?.length) {
        const hasAll = filters.facilities.every((facility) => hostel.facilities.includes(facility));
        if (!hasAll) {
          return false;
        }
      }
      return true;
    });
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = slugify(base);
    let suffix = 2;
    while (true) {
      const existing = await this.firestore.getDocs<Hostel>(
        COLLECTIONS.hostels,
        where('slug', '==', slug),
      );
      if (existing.every((item) => item.isDeleted)) {
        return slug;
      }
      slug = `${slugify(base)}-${suffix}`;
      suffix += 1;
      if (suffix > 50) {
        throw new AppError('already-exists', 'Could not generate a unique hostel URL.');
      }
    }
  }
}

function toMillis(value: Hostel['createdAt'] | Date | undefined): number {
  if (!value) {
    return 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}
