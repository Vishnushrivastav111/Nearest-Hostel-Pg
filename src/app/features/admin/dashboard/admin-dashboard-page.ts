import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { where } from 'firebase/firestore';
import { COLLECTIONS } from '../../../core/constants/collections';
import { FirestoreService } from '../../../core/services/firestore.service';
import { SeoService } from '../../../core/services/seo.service';
import { AppError } from '../../../core/utils/error.util';

interface DashboardStats {
  totalHostels: number;
  publishedHostels: number;
  draftHostels: number;
  activeRooms: number;
  availableBeds: number;
  newLeads: number;
  totalBookings: number;
  pendingCommission: number;
  paidCommission: number;
  totalCommission: number;
}

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [RouterLink],
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly firestore = inject(FirestoreService);
  private readonly seo = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stats = signal<DashboardStats | null>(null);

  constructor() {
    this.seo.set({
      title: 'Admin dashboard',
      description: 'Manage hostels, leads, bookings, and commissions.',
      path: '/admin/dashboard',
      noIndex: true,
    });
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [totalHostels, publishedHostels, draftHostels, newLeads, totalBookings, pendingCommission, paidCommission] =
        await Promise.all([
          this.firestore.count(COLLECTIONS.hostels, where('isDeleted', '==', false)),
          this.firestore.count(
            COLLECTIONS.hostels,
            where('status', '==', 'published'),
            where('isActive', '==', true),
            where('isDeleted', '==', false),
          ),
          this.firestore.count(COLLECTIONS.hostels, where('status', '==', 'draft'), where('isDeleted', '==', false)),
          this.firestore.count(COLLECTIONS.leads, where('status', '==', 'new')),
          this.firestore.count(COLLECTIONS.bookings),
          this.firestore.count(COLLECTIONS.commissions, where('paymentStatus', '==', 'pending')),
          this.firestore.count(COLLECTIONS.commissions, where('paymentStatus', '==', 'paid')),
        ]);

      const rooms = await this.firestore.getDocs<{
        id: string;
        isActive: boolean;
        isDeleted?: boolean;
        availableBeds?: number;
      }>(COLLECTIONS.rooms, where('isDeleted', '==', false));
      const activeRooms = rooms.filter((room) => room.isActive);
      const availableBeds = activeRooms.reduce((sum, room) => sum + (room.availableBeds ?? 0), 0);
      const paid = await this.firestore.getDocs<{ id: string; amount: number }>(
        COLLECTIONS.commissions,
        where('paymentStatus', '==', 'paid'),
      );
      const totalCommission = paid.reduce((sum, item) => sum + (item.amount ?? 0), 0);

      this.stats.set({
        totalHostels,
        publishedHostels,
        draftHostels,
        activeRooms: activeRooms.length,
        availableBeds,
        newLeads,
        totalBookings,
        pendingCommission,
        paidCommission,
        totalCommission,
      });
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load dashboard data.');
    } finally {
      this.loading.set(false);
    }
  }
}
