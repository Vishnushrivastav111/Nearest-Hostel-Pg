import { errorCategory, toAppError } from './error.util';

describe('toAppError', () => {
  it('maps a Firebase auth error to a friendly message', () => {
    const mapped = toAppError({ code: 'auth/invalid-credential', message: 'internal' });
    expect(mapped.userMessage).toBe('Invalid email or password.');
    expect(mapped.message).not.toContain('internal');
  });

  it('hides unknown stack details behind a generic message', () => {
    const mapped = toAppError(new Error('FirebaseError: FIRESTORE (11.0.0) INTERNAL'));
    expect(mapped.userMessage).toBe('Something went wrong. Please try again.');
  });

  it('groups Firebase codes into application categories', () => {
    expect(errorCategory('auth/invalid-credential')).toBe('AUTHENTICATION_ERROR');
    expect(errorCategory('permission-denied')).toBe('PERMISSION_DENIED');
    expect(errorCategory('not-found')).toBe('NOT_FOUND');
    expect(errorCategory('storage/unauthorized')).toBe('PERMISSION_DENIED');
    expect(errorCategory('storage/canceled')).toBe('UPLOAD_ERROR');
    expect(errorCategory('unavailable')).toBe('NETWORK_ERROR');
  });
});
