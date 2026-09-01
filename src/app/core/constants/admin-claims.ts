/**
 * Admin custom claims are never written from the Angular client.
 * Assign `{ admin: true }` with the Firebase Admin SDK or a privileged Cloud Function.
 * Until that pipeline exists, Firestore and Storage also accept the email allowlist.
 */
export const ADMIN_CUSTOM_CLAIM = 'admin';

export function tokenHasAdminClaim(claims: Record<string, unknown> | undefined): boolean {
  if (!claims) {
    return false;
  }
  return claims[ADMIN_CUSTOM_CLAIM] === true || claims['role'] === 'admin';
}
