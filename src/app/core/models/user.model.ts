import { Auditable } from './common.model';
import { MediaAsset } from './media.model';

export const USER_ROLES = ['admin', 'customer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface AppUser extends Auditable {
  readonly id: string;
  readonly uid: string;
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly photoUrl?: string;
  readonly photo?: MediaAsset;
}

export interface CreateUserInput {
  readonly uid: string;
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly role?: UserRole;
}
