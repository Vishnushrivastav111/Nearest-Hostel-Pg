import { UserRole } from '../models/user.model';

export const ROLES = {
  admin: 'admin',
  customer: 'customer',
} as const satisfies Record<UserRole, UserRole>;

/** Admin is granted only to emails in `ADMIN_EMAILS`. Keep Firestore/Storage rules in sync. */

export const ADMIN_CLAIM = 'admin';
