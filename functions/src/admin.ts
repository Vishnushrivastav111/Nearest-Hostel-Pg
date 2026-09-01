const ADMIN_EMAILS = new Set([
  'vishnushrivastav26072003@gmail.com',
  'realvishnu111@gmail.com',
]);

export const ALLOWED_FOLDERS = [
  'hostel-booking/hostels',
  'hostel-booking/rooms',
  'hostel-booking/videos',
  'hostel-booking/amenities',
  'hostel-booking/profiles',
] as const;

export type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

export interface CallableAuth {
  readonly uid: string;
  readonly token: {
    readonly email?: string;
    readonly admin?: boolean;
    readonly role?: string;
  };
}

export function isAdmin(auth: CallableAuth | undefined): boolean {
  if (!auth) {
    return false;
  }
  const email = auth.token.email?.trim().toLowerCase();
  return (
    (!!email && ADMIN_EMAILS.has(email)) ||
    auth.token.admin === true ||
    auth.token.role === 'admin'
  );
}

export function isAllowedFolder(folder: string): folder is AllowedFolder {
  return (ALLOWED_FOLDERS as readonly string[]).includes(folder);
}
