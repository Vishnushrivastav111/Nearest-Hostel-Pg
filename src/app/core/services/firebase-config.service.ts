import { Injectable, inject } from '@angular/core';
import { isFirebaseConfigured } from '../../../environments/environment.types';
import { environment } from '../../../environments/environment';
import { AppError } from '../utils/error.util';

@Injectable({ providedIn: 'root' })
export class FirebaseConfigService {
  readonly configured = isFirebaseConfigured(environment.firebase);

  assertConfigured(): void {
    if (!this.configured) {
      throw new AppError(
        'app/firebase-unconfigured',
        'Firebase is not configured yet. Add your project keys to the environment files.',
      );
    }
  }
}
