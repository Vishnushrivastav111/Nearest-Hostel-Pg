import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { INDIAN_MOBILE_PATTERN } from '../constants/app.constants';

export function normalizeIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE_PATTERN.test(normalizeIndianMobile(value));
}

export function indianMobileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return isValidIndianMobile(value) ? null : { indianMobile: true };
  };
}

export function isValidOptionalEmail(value: string | null | undefined): boolean {
  if (value == null || value.trim().length === 0) {
    return true;
  }
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim());
}
