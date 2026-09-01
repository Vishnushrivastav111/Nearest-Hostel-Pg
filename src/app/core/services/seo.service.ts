import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoInput {
  readonly title: string;
  readonly description: string;
  readonly path?: string;
  readonly image?: string;
  readonly noIndex?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  set(input: SeoInput): void {
    const fullTitle = input.title.includes('Nearest Hostel')
      ? input.title
      : `${input.title} | Nearest Hostel`;
    const description = input.description.slice(0, 180);
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({
      name: 'robots',
      content: input.noIndex ? 'noindex, nofollow' : 'index, follow',
    });

    const origin = isPlatformBrowser(this.platformId)
      ? this.document.location.origin
      : 'https://nearesthostelpg.web.app';
    const url = `${origin}${input.path ?? '/'}`;
    this.meta.updateTag({ property: 'og:url', content: url });
    this.setCanonical(url);

    if (input.image) {
      this.meta.updateTag({ property: 'og:image', content: input.image });
    }
  }

  setJsonLd(data: Record<string, unknown> | null): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const existing = this.document.getElementById('hostel-jsonld');
    existing?.remove();
    if (!data) {
      return;
    }
    const script = this.document.createElement('script');
    script.id = 'hostel-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  private setCanonical(url: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
