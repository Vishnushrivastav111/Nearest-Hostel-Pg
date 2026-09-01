import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SeoService } from '../../../core/services/seo.service';
import { CONTENT_PAGES, contentKeyFromUrl } from './content-pages';

@Component({
  selector: 'app-content-page',
  templateUrl: './content-page.html',
  styleUrl: './content-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentPage {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  private readonly key = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => contentKeyFromUrl(event.urlAfterRedirects)),
      startWith(contentKeyFromUrl(this.router.url)),
    ),
    { initialValue: contentKeyFromUrl(this.router.url) },
  );

  readonly copy = computed(() => CONTENT_PAGES[this.key()] ?? CONTENT_PAGES['about']);

  constructor() {
    effect(() => {
      const copy = this.copy();
      this.seo.set({
        title: copy.title,
        description: copy.description,
        path: this.router.url.split('?')[0] || '/',
      });
    });
  }
}
