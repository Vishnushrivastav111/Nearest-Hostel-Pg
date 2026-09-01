import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { Booking } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/services/booking.service';
import { AppError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-admin-bookings-page',
  templateUrl: './admin-bookings-page.html',
  styleUrl: './admin-bookings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBookingsPage {
  private readonly bookings = inject(BookingService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly items = signal<Booking[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  async load(): Promise<void> {
    try {
      const page = await this.bookings.listAdmin(undefined, { pageSize: 50 });
      this.items.set(page.items);
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load bookings.');
    }
  }

  async cancel(id: string): Promise<void> {
    await this.bookings.cancelBooking(id);
    await this.load();
  }
}
