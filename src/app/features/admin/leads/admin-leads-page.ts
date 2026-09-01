import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LEAD_STATUSES, Lead, LeadStatus } from '../../../core/models/lead.model';
import { AdminHostelContact } from '../../../core/models/hostel-contact.model';
import { BookingService } from '../../../core/services/booking.service';
import { HostelContactService } from '../../../core/services/hostel-contact.service';
import { LeadService } from '../../../core/services/lead.service';
import { AppError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-admin-leads-page',
  imports: [FormsModule],
  templateUrl: './admin-leads-page.html',
  styleUrl: './admin-leads-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLeadsPage {
  private readonly leadsApi = inject(LeadService);
  private readonly bookings = inject(BookingService);
  private readonly contacts = inject(HostelContactService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly statuses = LEAD_STATUSES;
  readonly leads = signal<Lead[]>([]);
  readonly selected = signal<Lead | null>(null);
  readonly contact = signal<AdminHostelContact | null>(null);
  readonly error = signal<string | null>(null);
  readonly notes = signal('');
  readonly search = signal('');
  readonly converting = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  filtered(): Lead[] {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.leads();
    }
    return this.leads().filter((lead) =>
      `${lead.id} ${lead.customerName} ${lead.customerPhone} ${lead.hostelName ?? ''}`.toLowerCase().includes(term),
    );
  }

  async load(): Promise<void> {
    try {
      const page = await this.leadsApi.listAdmin(undefined, { pageSize: 50 });
      this.leads.set(page.items);
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load leads.');
    }
  }

  async open(lead: Lead): Promise<void> {
    this.selected.set(lead);
    this.notes.set(lead.notes ?? '');
    this.contact.set(await this.contacts.getByHostelId(lead.hostelId));
  }

  async setStatus(status: LeadStatus): Promise<void> {
    const lead = this.selected();
    if (!lead) {
      return;
    }
    await this.leadsApi.updateLeadStatus(lead.id, status, this.notes());
    await this.load();
    const next = this.leads().find((item) => item.id === lead.id);
    if (next) {
      this.selected.set(next);
    }
  }

  async convert(): Promise<void> {
    const lead = this.selected();
    if (!lead || this.converting()) {
      return;
    }
    this.converting.set(true);
    try {
      await this.bookings.createBooking({ leadId: lead.id, createCommission: true });
      await this.load();
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not convert this lead.');
    } finally {
      this.converting.set(false);
    }
  }
}
