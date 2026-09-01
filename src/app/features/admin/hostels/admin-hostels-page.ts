import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Hostel } from '../../../core/models/hostel.model';
import { HostelService } from '../../../core/services/hostel.service';
import { SeoService } from '../../../core/services/seo.service';
import { AppError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-admin-hostels-page',
  imports: [RouterLink],
  templateUrl: './admin-hostels-page.html',
  styleUrl: './admin-hostels-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHostelsPage {
  private readonly hostelsApi = inject(HostelService);
  private readonly seo = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly hostels = signal<Hostel[]>([]);
  readonly busyId = signal<string | null>(null);
  readonly busyAction = signal<'publish' | 'unpublish' | 'deactivate' | null>(null);

  constructor() {
    this.seo.set({ title: 'Hostels', description: 'Admin hostel list', path: '/admin/hostels', noIndex: true });
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await this.hostelsApi.listAdmin({}, { pageSize: 50 });
      this.hostels.set(page.items);
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load hostels.');
    } finally {
      this.loading.set(false);
    }
  }

  actionLabel(id: string, action: 'publish' | 'unpublish' | 'deactivate'): string {
    if (this.busyId() !== id || this.busyAction() !== action) {
      return action === 'publish' ? 'Publish' : action === 'unpublish' ? 'Unpublish' : 'Deactivate';
    }
    return action === 'publish' ? 'Publishing…' : action === 'unpublish' ? 'Unpublishing…' : 'Deactivating…';
  }

  async publish(id: string): Promise<void> {
    await this.run(id, 'publish', () => this.hostelsApi.publishHostel(id), 'Published. This hostel is now live.');
  }

  async unpublish(id: string): Promise<void> {
    await this.run(id, 'unpublish', () => this.hostelsApi.unpublishHostel(id), 'Unpublished. This hostel is hidden from the public site.');
  }

  async deactivate(id: string): Promise<void> {
    await this.run(id, 'deactivate', () => this.hostelsApi.deactivateHostel(id), 'Hostel deactivated.');
  }

  private async run(
    id: string,
    action: 'publish' | 'unpublish' | 'deactivate',
    work: () => Promise<void>,
    success: string,
  ): Promise<void> {
    this.busyId.set(id);
    this.busyAction.set(action);
    this.error.set(null);
    this.notice.set(null);
    try {
      await work();
      this.notice.set(success);
      await this.load();
    } catch (error) {
      this.error.set(
        error instanceof AppError
          ? `${action === 'publish' ? 'Publishing failed.' : 'Action failed.'} ${error.userMessage}`
          : 'Action failed. Please try again.',
      );
    } finally {
      this.busyId.set(null);
      this.busyAction.set(null);
    }
  }
}
