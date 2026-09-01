const MAX_SLUG_LENGTH = 80;

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

  return slug.length > 0 ? slug : 'hostel';
}

export function slugWithSuffix(base: string, suffix: number): string {
  return suffix <= 1 ? slugify(base) : `${slugify(base)}-${suffix}`;
}

export function buildHostelPath(city: string, area: string, slug: string): string {
  return `/hostels/${slugify(city)}/${slugify(area)}/${slugify(slug)}`;
}
