import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CLOUDINARY_FOLDERS } from '../../../core/constants/cloudinary';
import { AppUser } from '../../../core/models/user.model';
import { MediaAsset } from '../../../core/models/media.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AppError } from '../../../core/utils/error.util';
import { MediaUploader } from '../../../shared/components/media-uploader/media-uploader';

@Component({
  selector: 'app-account-page',
  imports: [RouterLink, MediaUploader],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: 'true' },
})
export class AccountPage {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly folders = CLOUDINARY_FOLDERS;
  readonly profile = signal<AppUser | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  photos(): MediaAsset[] {
    const profile = this.profile();
    if (!profile) {
      return [];
    }
    if (profile.photo) {
      return [profile.photo];
    }
    if (profile.photoUrl) {
      return [
        {
          publicId: profile.photoUrl,
          secureUrl: profile.photoUrl,
          originalFileName: 'profile',
          format: '',
          bytes: 0,
          resourceType: 'image',
          folder: CLOUDINARY_FOLDERS.profiles,
          uploadedAt: new Date(0).toISOString(),
        },
      ];
    }
    return [];
  }

  async load(): Promise<void> {
    const user = await this.auth.waitForUser();
    if (!user) {
      await this.router.navigateByUrl('/login');
      return;
    }
    try {
      await this.users.ensureProfile(user);
      this.profile.set(await this.users.getById(user.uid));
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load your profile.');
    }
  }

  async savePhoto(items: MediaAsset[]): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }
    const photo = items[0];
    try {
      await this.users.updateProfile(user.uid, {
        photo,
        photoUrl: photo?.secureUrl,
      });
      this.notice.set(photo ? 'Profile photo saved.' : 'Profile photo removed.');
      await this.load();
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not save profile photo.');
    }
  }
}
