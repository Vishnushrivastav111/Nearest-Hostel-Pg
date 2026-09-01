import { slugify, slugWithSuffix, buildHostelPath } from './slug.util';

describe('slugify', () => {
  it('creates a lowercase hyphenated slug', () => {
    expect(slugify('Sunrise Boys Hostel')).toBe('sunrise-boys-hostel');
  });

  it('falls back when the value has no usable characters', () => {
    expect(slugify('***')).toBe('hostel');
  });
});

describe('slugWithSuffix', () => {
  it('keeps the base slug and appends a counter for duplicates', () => {
    expect(slugWithSuffix('Sunrise Boys Hostel', 1)).toBe('sunrise-boys-hostel');
    expect(slugWithSuffix('Sunrise Boys Hostel', 2)).toBe('sunrise-boys-hostel-2');
  });
});

describe('buildHostelPath', () => {
  it('builds a nested SEO path', () => {
    expect(buildHostelPath('Bhopal', 'MP Nagar', 'Sunrise Boys Hostel')).toBe(
      '/hostels/bhopal/mp-nagar/sunrise-boys-hostel',
    );
  });
});
