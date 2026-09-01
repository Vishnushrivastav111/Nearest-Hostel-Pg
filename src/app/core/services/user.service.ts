import { Injectable, inject } from '@angular/core';
import { User } from 'firebase/auth';
import { orderBy, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { isAdminEmail, normalizeEmail } from '../constants/admin-emails';
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';
import { AppUser, CreateUserInput, UserRole } from '../models/user.model';
import { omitUndefined } from '../utils/firestore.util';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firestore = inject(FirestoreService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);

  watchById(uid: string): Observable<AppUser | null> {
    return this.firestore.watchById<AppUser>(COLLECTIONS.users, uid);
  }

  getById(uid: string): Promise<AppUser | null> {
    return this.errors.wrap(() => this.firestore.getById<AppUser>(COLLECTIONS.users, uid));
  }

  getUserById(uid: string): Promise<AppUser | null> {
    return this.getById(uid);
  }

  createUserProfile(input: CreateUserInput): Promise<void> {
    return this.createProfile(input);
  }

  updateUserProfile(
    uid: string,
    patch: Partial<Pick<AppUser, 'name' | 'phone' | 'photoUrl' | 'photo'>>,
  ): Promise<void> {
    return this.updateProfile(uid, patch);
  }

  getCustomersForAdmin(): Promise<AppUser[]> {
    return this.listByRole(ROLES.customer);
  }

  async ensureProfile(user: User): Promise<void> {
    return this.errors.wrap(async () => {
      const email = user.email ? normalizeEmail(user.email) : undefined;
      const role = isAdminEmail(email) ? ROLES.admin : ROLES.customer;
      const name = user.displayName?.trim() || email?.split('@')[0] || 'User';
      const existing = await this.firestore.getById<AppUser>(COLLECTIONS.users, user.uid);

      if (!existing) {
        await this.createProfile({
          uid: user.uid,
          name,
          email,
          role,
        });
        return;
      }

      if (existing.role === role && existing.email === email) {
        return;
      }

      await updateDoc(
        this.firestore.docRef(COLLECTIONS.users, user.uid),
        omitUndefined({
          role,
          email,
          ...this.firestore.touchFields(user.uid),
        }),
      );
    });
  }

  async createProfile(input: CreateUserInput): Promise<void> {
    return this.errors.wrap(async () => {
      const ref = this.firestore.docRef(COLLECTIONS.users, input.uid);
      await setDoc(
        ref,
        omitUndefined({
          id: input.uid,
          uid: input.uid,
          name: input.name.trim(),
          email: input.email?.trim().toLowerCase(),
          phone: input.phone,
          role: input.role ?? ROLES.customer,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: input.uid,
          updatedBy: input.uid,
        }),
      );
    });
  }

  async updateProfile(
    uid: string,
    patch: Partial<Pick<AppUser, 'name' | 'phone' | 'photoUrl' | 'photo'>>,
  ): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(
        this.firestore.docRef(COLLECTIONS.users, uid),
        omitUndefined({
          ...patch,
          ...this.firestore.touchFields(this.auth.currentUser()?.uid),
        }),
      );
    });
  }

  async setActive(uid: string, isActive: boolean): Promise<void> {
    return this.errors.wrap(async () => {
      await updateDoc(this.firestore.docRef(COLLECTIONS.users, uid), {
        isActive,
        ...this.firestore.touchFields(this.auth.currentUser()?.uid),
      });
    });
  }

  listByRole(role: UserRole): Promise<AppUser[]> {
    return this.errors.wrap(() =>
      this.firestore.getDocs<AppUser>(
        COLLECTIONS.users,
        where('role', '==', role),
        orderBy('createdAt', 'desc'),
      ),
    );
  }
}
