import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isAdminEmail } from '../constants/admin-emails';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const user = await auth.waitForUser();
  if (user && isAdminEmail(user.email)) {
    return true;
  }

  if (user) {
    return router.createUrlTree(['/']);
  }

  return router.createUrlTree(['/login']);
};
