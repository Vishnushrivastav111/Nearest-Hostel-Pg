import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';
import { AppError, toAppError } from '../utils/error.util';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private readonly logger = inject(LoggerService);

  toAppError(error: unknown): AppError {
    const mapped = toAppError(error);
    this.logger.error(mapped.code, mapped.original ?? mapped.message);
    return mapped;
  }

  async wrap<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.toAppError(error);
    }
  }
}
