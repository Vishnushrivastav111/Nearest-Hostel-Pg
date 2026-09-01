import { isValidIndianMobile, isValidOptionalEmail, normalizeIndianMobile } from './phone.util';

describe('normalizeIndianMobile', () => {
  it('strips country code and leading zero', () => {
    expect(normalizeIndianMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeIndianMobile('09876543210')).toBe('9876543210');
  });
});

describe('isValidIndianMobile', () => {
  it('accepts valid numbers', () => {
    expect(isValidIndianMobile('9876543210')).toBeTrue();
    expect(isValidIndianMobile('+919696345338')).toBeTrue();
  });

  it('rejects invalid numbers', () => {
    expect(isValidIndianMobile('5876543210')).toBeFalse();
    expect(isValidIndianMobile('123')).toBeFalse();
  });
});

describe('isValidOptionalEmail', () => {
  it('allows empty values and valid emails', () => {
    expect(isValidOptionalEmail('')).toBeTrue();
    expect(isValidOptionalEmail('user@example.com')).toBeTrue();
  });

  it('rejects invalid emails', () => {
    expect(isValidOptionalEmail('not-an-email')).toBeFalse();
  });
});
