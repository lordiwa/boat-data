// app/src/utils/__tests__/slug.spec.ts
//
// TASK-014: slugify builds CSV export filenames from on-screen labels
// (EntityListView's 'Yacht Clubs', a report's title, an entity's name). A
// regression here would silently rename a downloaded file.
import { describe, expect, it } from 'vitest';
import { slugify } from '../slug';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Yacht Clubs')).toBe('yacht-clubs');
  });

  it('collapses punctuation into a single hyphen', () => {
    expect(slugify('Top 10 Builders: by Fleet Size!')).toBe('top-10-builders-by-fleet-size');
  });

  it('strips accents', () => {
    expect(slugify('Ünïcode Test')).toBe('unicode-test');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  Oceanco  ')).toBe('oceanco');
  });

  it('falls back to "export" for a string with nothing slug-able', () => {
    expect(slugify('!!!')).toBe('export');
    expect(slugify('')).toBe('export');
  });
});
