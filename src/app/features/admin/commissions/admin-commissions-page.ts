import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { Commission } from '../../../core/models/commission.model';
import { CommissionService } from '../../../core/services/commission.service';
import { AppError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-admin-commissions-page',
  templateUrl: './admin-commissions-page.html',
  styleUrl: './admin-commissions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommissionsPage {
  private readonly commissions = inject(CommissionService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly items = signal<Commission[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  async load(): Promise<void> {
    try {
      const page = await this.commissions.listAdmin(undefined, { pageSize: 50 });
      this.items.set(page.items);
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load commissions.');
    }
  }

  async markPaid(id: string): Promise<void> {
    await this.commissions.markCommissionPaid(id);
    await this.load();
  }

  async cancel(id: string): Promise<void> {
    await this.commissions.cancelCommission(id);
    await this.load();
  }
}
