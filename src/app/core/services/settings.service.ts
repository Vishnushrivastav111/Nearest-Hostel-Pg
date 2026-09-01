import { Injectable, inject } from '@angular/core';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { COLLECTIONS, SETTINGS_DOC_IDS } from '../constants/collections';
import { MEDIA_LIMITS } from '../constants/media';
import { DUPLICATE_LEAD_WINDOW_MINUTES } from '../constants/app.constants';
import { DEFAULT_FACILITY_NAMES } from '../models/facility.model';
import { AppSettings, PublicSettings } from '../models/settings.model';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

const DEFAULT_APP_SETTINGS: Omit<AppSettings, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> =
  {
    id: 'app',
    defaultCommissionType: 'fixed',
    defaultCommissionAmount: 1000,
    defaultCommissionPercentage: 10,
    duplicateLeadWindowMinutes: DUPLICATE_LEAD_WINDOW_MINUTES,
    maxImageSizeBytes: MEDIA_LIMITS.maxImageSizeBytes,
    maxVideoSizeBytes: MEDIA_LIMITS.maxVideoSizeBytes,
    siteName: 'Hostel Marketplace',
    websiteName: 'Hostel Marketplace',
    defaultCommission: 1000,
    defaultFacilities: [...DEFAULT_FACILITY_NAMES],
    cities: [],
    areas: [],
  };

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  getAppSettings(): Promise<AppSettings | null> {
    return this.errors.wrap(() =>
      this.firestore.getById<AppSettings>(COLLECTIONS.settings, SETTINGS_DOC_IDS.app),
    );
  }

  getPublicSettings(): Promise<PublicSettings | null> {
    return this.errors.wrap(() =>
      this.firestore.getById<PublicSettings>(COLLECTIONS.settings, SETTINGS_DOC_IDS.public),
    );
  }

  async saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
    return this.errors.wrap(async () => {
      const uid = this.auth.currentUser()?.uid;
      const current = await this.getAppSettings();
      await setDoc(
        this.firestore.docRef(COLLECTIONS.settings, SETTINGS_DOC_IDS.app),
        omitUndefined({
          ...DEFAULT_APP_SETTINGS,
          ...current,
          ...settings,
          id: 'app',
          createdAt: current?.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: current?.createdBy ?? uid,
          updatedBy: uid,
        }),
        { merge: true },
      );
    });
  }

  async savePublicSettings(settings: Partial<PublicSettings>): Promise<void> {
    return this.errors.wrap(async () => {
      await setDoc(
        this.firestore.docRef(COLLECTIONS.settings, SETTINGS_DOC_IDS.public),
        omitUndefined({
          id: 'public',
          siteName: settings.siteName ?? 'Hostel Marketplace',
          tagline: settings.tagline ?? 'Find Your Perfect Hostel',
          popularCities: settings.popularCities ?? [],
          supportEmail: settings.supportEmail,
          supportPhone: settings.supportPhone,
        }),
        { merge: true },
      );
    });
  }
}
