export class AppError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly original?: unknown;

  constructor(code: string, userMessage: string, original?: unknown) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.original = original;
  }
}

interface FirebaseLikeError {
  readonly code?: string;
  readonly message?: string;
}

function isFirebaseLikeError(error: unknown): error is FirebaseLikeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

const USER_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account was found for that email.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this project yet.',
  'auth/missing-email': 'Enter a valid email first.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/unauthorized-continue-uri': 'This site is not authorized for password reset yet.',
  'app/not-admin': 'This email is not an admin account.',
  'permission-denied': 'You do not have permission to do that.',
  'unauthenticated': 'Please sign in to continue.',
  'not-found': 'The requested record was not found.',
  'already-exists': 'This record already exists.',
  'failed-precondition': 'This listing could not be loaded yet. Please retry in a moment.',
  'unavailable': 'The service is temporarily unavailable. Please retry.',
  'resource-exhausted': 'Too many requests. Please wait and retry.',
  'storage/unauthorized': 'You are not allowed to upload this file.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/retry-limit-exceeded': 'Upload failed after several retries.',
  'app/firebase-unconfigured':
    'Firebase is not configured yet. Add your project keys to the environment files.',
  'app/duplicate-lead':
    'We already received a similar request a few minutes ago. Our team will contact you shortly.',
  'app/no-beds': 'This room no longer has available beds.',
  'app/invalid-lead': 'This enquiry cannot be converted to a booking.',
  'invalid-argument': 'Please check the selected file and try again.',
  'functions/unauthenticated': 'Please sign in to continue.',
  'functions/permission-denied': 'You do not have permission to manage this media.',
  'functions/invalid-argument': 'That upload request was not valid.',
};

export type ErrorCategory =
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UPLOAD_ERROR'
  | 'UNKNOWN_ERROR';

export function errorCategory(code: string): ErrorCategory {
  if (code.startsWith('auth/') || code === 'unauthenticated' || code === 'app/not-admin') {
    return 'AUTHENTICATION_ERROR';
  }
  if (code === 'permission-denied' || code === 'storage/unauthorized') {
    return 'PERMISSION_DENIED';
  }
  if (code === 'not-found') {
    return 'NOT_FOUND';
  }
  if (code === 'unavailable' || code === 'resource-exhausted') {
    return 'NETWORK_ERROR';
  }
  if (code.startsWith('storage/')) {
    return 'UPLOAD_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isFirebaseLikeError(error) && typeof error.code === 'string') {
    const code = error.code.replace('functions/', '');
    const userMessage = USER_MESSAGES[code] ?? USER_MESSAGES[code.replace(/^storage\//, '')] ??
      'Something went wrong. Please try again.';
    return new AppError(code, userMessage, error);
  }

  if (error instanceof Error) {
    return new AppError('unknown', 'Something went wrong. Please try again.', error);
  }

  return new AppError('unknown', 'Something went wrong. Please try again.', error);
}
