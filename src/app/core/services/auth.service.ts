import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  User,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { Observable, map } from 'rxjs';
import { isAdminEmail, normalizeEmail } from '../constants/admin-emails';
import { ROLES } from '../constants/roles';
import { UserRole } from '../models/user.model';
import { AppError } from '../utils/error.util';
import { ErrorHandlerService } from './error-handler.service';
import { FirebaseConfigService } from './firebase-config.service';

export interface SignInOptions {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}

export interface RegisterOptions {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly phone?: string;
  readonly remember?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly errors = inject(ErrorHandlerService);
  private readonly config = inject(FirebaseConfigService);

  readonly firebaseUser$: Observable<User | null> = authState(this.auth);
  readonly authState$ = this.firebaseUser$;

  readonly uid$: Observable<string | null> = this.firebaseUser$.pipe(
    map((user) => user?.uid ?? null),
  );

  currentUser(): User | null {
    return this.auth.currentUser;
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  async waitForUser(): Promise<User | null> {
    await this.auth.authStateReady();
    return this.auth.currentUser;
  }

  async getRole(): Promise<UserRole | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }
    if (isAdminEmail(user.email)) {
      return ROLES.admin;
    }
    return ROLES.customer;
  }

  async isAdmin(): Promise<boolean> {
    return (await this.getRole()) === ROLES.admin;
  }

  async loginAdmin(options: SignInOptions): Promise<User> {
    if (!isAdminEmail(options.email)) {
      throw new AppError('app/not-admin', 'This email is not an admin account.');
    }
    const user = await this.signIn(options);
    if (!(await this.isAdmin())) {
      await this.signOut();
      throw new AppError('app/not-admin', 'This email is not an admin account.');
    }
    return user;
  }

  logout(): Promise<void> {
    return this.signOut();
  }

  resetPassword(email: string): Promise<void> {
    return this.sendPasswordReset(email);
  }

  async isCustomer(): Promise<boolean> {
    const role = await this.getRole();
    if (role === ROLES.admin) {
      return false;
    }
    return this.auth.currentUser !== null;
  }

  async signIn(options: SignInOptions): Promise<User> {
    return this.errors.wrap(async () => {
      this.config.assertConfigured();
      const credential = await signInWithEmailAndPassword(
        this.auth,
        normalizeEmail(options.email),
        options.password,
      );
      await credential.user.getIdToken(true);
      return credential.user;
    });
  }

  async register(options: RegisterOptions): Promise<User> {
    return this.errors.wrap(async () => {
      this.config.assertConfigured();
      const credential = await createUserWithEmailAndPassword(
        this.auth,
        normalizeEmail(options.email),
        options.password,
      );
      await updateProfile(credential.user, { displayName: options.name.trim() });
      return credential.user;
    });
  }

  async sendPasswordReset(email: string): Promise<void> {
    return this.errors.wrap(async () => {
      this.config.assertConfigured();
      await sendPasswordResetEmail(this.auth, normalizeEmail(email));
    });
  }

  async signOut(): Promise<void> {
    return this.errors.wrap(async () => {
      await signOut(this.auth);
    });
  }

  async refreshToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }
    return user.getIdToken(true);
  }
}
