import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

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
  private readonly siteName = environment.siteName;
  private readonly siteUrl = environment.siteUrl.replace(/\/$/, '');

  set(input: SeoInput): void {
    const fullTitle = input.title.includes(this.siteName)
      ? input.title
      : `${input.title} | ${this.siteName}`;
    const description = input.description.slice(0, 160);
    const path = input.path ?? '/';
    const url = `${this.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const image = input.image || `${this.siteUrl}/og-image.png`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'application-name', content: this.siteName });
    this.meta.updateTag({
      name: 'robots',
      content: input.noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    });

    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:locale', content: 'en_IN' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
  }

  setJsonLd(data: Record<string, unknown> | null): void {
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

  organizationJsonLd(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${this.siteUrl}/#organization`,
          name: this.siteName,
          url: this.siteUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${this.siteUrl}/icon-512.png`,
          },
          description: 'Find verified PGs and hostels near you with photos, rooms, and starting prices.',
        },
        {
          '@type': 'WebSite',
          '@id': `${this.siteUrl}/#website`,
          name: this.siteName,
          url: this.siteUrl,
          publisher: { '@id': `${this.siteUrl}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${this.siteUrl}/hostels?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    };
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
