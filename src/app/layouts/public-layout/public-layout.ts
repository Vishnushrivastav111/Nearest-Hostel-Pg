import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, HostListener, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { isAdminEmail } from '../../core/constants/admin-emails';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { SearchUiService } from '../../core/services/search-ui.service';
import { SearchSheet } from '../../shared/components/search-sheet/search-sheet';

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SearchSheet],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLayout {
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchUi = inject(SearchUiService);
  private readonly location = inject(LocationService);

  readonly userEmail = signal<string | null>(null);
  readonly isAdmin = signal(false);
  readonly signingOut = signal(false);
  readonly navOpen = signal(false);
  readonly accountOpen = signal(false);
  readonly searchOpen = this.searchUi.open;
  readonly locating = this.location.locating;
  readonly locationError = this.location.locationError;
  readonly placeLabel = computed(() => this.location.lastPlace()?.label ?? '');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.closeMenus());

    afterNextRender(() => {
      const auth = this.injector.get(AuthService);
      auth.firebaseUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
        this.userEmail.set(user?.email ?? null);
        this.isAdmin.set(isAdminEmail(user?.email));
      });
      void this.refreshLocation();
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.accountOpen()) {
      this.accountOpen.set(false);
    }
  }

  initials(): string {
    const email = this.userEmail() ?? 'A';
    return email.slice(0, 1).toUpperCase();
  }

  async refreshLocation(): Promise<void> {
    try {
      await this.location.detect(true);
    } catch {
      // The location bar already shows locationError().
    }
  }

  openSearch(): void {
    this.closeMenus();
    const query = this.router.parseUrl(this.router.url).queryParams;
    this.searchUi.show({
      city: query['city'] ?? '',
      area: query['area'] ?? '',
      type: query['type'] ?? '',
      maxPrice: query['maxPrice'] ?? '',
      sharingType: query['sharingType'] ?? '',
    });
  }

  toggleNav(): void {
    this.accountOpen.set(false);
    this.navOpen.update((open) => !open);
  }

  toggleAccount(event: Event): void {
    event.stopPropagation();
    this.navOpen.set(false);
    this.accountOpen.update((open) => !open);
  }

  closeMenus(): void {
    this.navOpen.set(false);
    this.accountOpen.set(false);
  }

  async signOut(): Promise<void> {
    if (this.signingOut()) {
      return;
    }
    this.signingOut.set(true);
    this.closeMenus();
    try {
      await this.injector.get(AuthService).signOut();
      await this.router.navigateByUrl('/');
    } finally {
      this.signingOut.set(false);
    }
  }
}
