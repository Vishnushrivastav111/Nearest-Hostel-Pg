import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { isAdminEmail, normalizeEmail } from '../../../core/constants/admin-emails';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AppError, toAppError } from '../../../core/utils/error.util';

@Component({
  selector: 'app-admin-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-login-page.html',
  styleUrl: './admin-login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: 'true' },
})
export class AdminLoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly resetMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.redirectIfSignedIn();
    }
  }

  showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.touched && control.invalid;
  }

  showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.touched && control.invalid;
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  signIn(event?: Event): void {
    event?.preventDefault();
    void this.authenticate('signin');
  }

  createAccount(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    void this.authenticate('register');
  }

  async resetPassword(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    this.resetMessage.set(null);
    this.errorMessage.set(null);
    this.form.controls.email.markAsTouched();
    if (this.form.controls.email.invalid) {
      this.errorMessage.set('Enter a valid email first, then tap Forgot password.');
      return;
    }
    this.submitting.set(true);
    try {
      await this.auth.resetPassword(this.form.controls.email.value);
      this.resetMessage.set('If this email can receive mail, a reset link is on its way. Check inbox and spam.');
    } catch (error) {
      this.errorMessage.set(this.messageFrom(error, 'Could not send a reset email.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private async redirectIfSignedIn(): Promise<void> {
    const user = await this.auth.waitForUser();
    if (!user) {
      return;
    }
    await this.router.navigateByUrl(this.homeFor(user.email));
  }

  private async authenticate(mode: 'signin' | 'register'): Promise<void> {
    this.errorMessage.set(null);
    this.resetMessage.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set(
        mode === 'register'
          ? 'Enter a valid email and a password of at least 6 characters to create an account.'
          : 'Enter a valid email and password to sign in.',
      );
      return;
    }
    if (this.submitting()) {
      return;
    }

    const { email, password, remember } = this.form.getRawValue();
    this.submitting.set(true);
    try {
      const user =
        mode === 'register'
          ? await this.auth.register({
              name: normalizeEmail(email).split('@')[0],
              email,
              password,
              remember,
            })
          : await this.auth.signIn({ email, password, remember });

      try {
        await this.users.ensureProfile(user);
      } catch {
        // Auth succeeded; a profile write must not block sign-in.
      }

      await this.router.navigateByUrl(this.homeFor(user.email));
    } catch (error) {
      this.errorMessage.set(
        this.messageFrom(
          error,
          mode === 'register' ? 'Could not create the account. Please try again.' : 'Could not sign in. Please try again.',
        ),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private homeFor(email: string | null): string {
    return isAdminEmail(email) ? '/admin/dashboard' : '/';
  }

  private messageFrom(error: unknown, fallback: string): string {
    if (error instanceof AppError) {
      return error.userMessage;
    }
    return toAppError(error).userMessage || fallback;
  }
}
