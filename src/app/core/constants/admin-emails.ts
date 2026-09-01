export const ADMIN_EMAILS = [
  'vishnushrivastav26072003@gmail.com',
  'realvishnu111@gmail.com',
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return (ADMIN_EMAILS as readonly string[]).includes(normalizeEmail(email));
}
