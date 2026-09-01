import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  info(message: string, details?: unknown): void {
    if (!environment.production) {
      console.info(message, details ?? '');
    }
  }

  warn(message: string, details?: unknown): void {
    if (!environment.production) {
      console.warn(message, details ?? '');
    }
  }

  error(message: string, details?: unknown): void {
    if (!environment.production) {
      console.error(message, details ?? '');
    }
  }
}
