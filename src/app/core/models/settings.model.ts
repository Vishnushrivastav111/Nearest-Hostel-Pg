import { Auditable } from './common.model';
import { CommissionType } from './commission.model';

export type DefaultCommissionType = CommissionType;

export interface SettingsSeo {
  readonly title?: string;
  readonly description?: string;
}

export interface AppSettings extends Auditable {
  readonly id: 'app';
  readonly siteName: string;
  readonly websiteName: string;
  readonly logoUrl?: string;
  readonly supportEmail?: string;
  readonly supportPhone?: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly defaultCommissionType: CommissionType;
  readonly defaultCommissionAmount: number;
  readonly defaultCommissionPercentage: number;
  readonly defaultCommission?: number;
  readonly defaultFacilities: string[];
  readonly cities: string[];
  readonly areas: string[];
  readonly seo?: SettingsSeo;
  readonly duplicateLeadWindowMinutes: number;
  readonly maxImageSizeBytes: number;
  readonly maxVideoSizeBytes: number;
}

export interface PublicSettings {
  readonly id: 'public';
  readonly siteName: string;
  readonly tagline: string;
  readonly popularCities: string[];
  readonly supportEmail?: string;
  readonly supportPhone?: string;
}
