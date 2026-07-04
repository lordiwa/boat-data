// ingest/tests/normalize.spec.js
//
// TASK-003: shared normalization helpers used by the yacht mapper (and
// future builder/person mappers) for entity resolution. Fixtures below
// are drawn from real corpus values (Lürssen/Lurssen, "162 m (533 ft)",
// "€650,000", "$18.4 billion", etc) so the parsers stay grounded in the
// actual Grok-export formats rather than idealized synthetic input.

import { describe, it, expect } from 'vitest';
import {
  stripDiacritics,
  normalizeName,
  isEmptyValue,
  slug,
  parseLength,
  lengthsMatch,
  parseMoney,
  parseIntSafe,
  parseYear,
} from '../src/mappers/normalize.js';

describe('stripDiacritics', () => {
  it('strips diacritics so Lürssen and Lurssen become identical', () => {
    expect(stripDiacritics('Lürssen')).toBe('Lurssen');
    expect(stripDiacritics('Lürssen')).toBe(stripDiacritics('Lurssen'));
  });
});

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Eclipse  ')).toBe('eclipse');
  });

  it('is diacritic-insensitive (Lürssen == Lurssen)', () => {
    expect(normalizeName('Lürssen')).toBe(normalizeName('Lurssen'));
    expect(normalizeName('Lürssen')).toBe('lurssen');
  });

  it('strips a leading M/Y or S/Y vessel-type prefix', () => {
    expect(normalizeName('M/Y Eclipse')).toBe('eclipse');
    expect(normalizeName('MY Eclipse')).toBe('eclipse');
    expect(normalizeName('S/Y Koru')).toBe('koru');
    expect(normalizeName('SY Koru')).toBe('koru');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeName('Big   Data')).toBe('big data');
  });

  it('returns an empty string for null/undefined', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });
});

describe('isEmptyValue', () => {
  it('treats blank, dash, and common "no data" tokens as empty', () => {
    for (const value of [
      '',
      '   ',
      'N/A',
      'n/a',
      'NA',
      'Unknown',
      'None',
      'None mentioned',
      'None publicly known',
      '—',
      '-',
      'Not specified',
      'Not specified (high-end)',
    ]) {
      expect(isEmptyValue(value)).toBe(true);
    }
  });

  it('treats null/undefined as empty', () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
  });

  it('treats real data as not empty', () => {
    expect(isEmptyValue('Roman Abramovich')).toBe(false);
    expect(isEmptyValue('Lürssen')).toBe(false);
    expect(isEmptyValue('162 m (533 ft)')).toBe(false);
  });
});

describe('slug', () => {
  it('produces a lowercase, dash-separated, diacritic-free slug', () => {
    expect(slug('Lürssen')).toBe('lurssen');
    expect(slug('Blohm + Voss')).toBe('blohm-voss');
    expect(slug("O'Madeleine")).toBe('o-madeleine');
  });

  it('trims leading/trailing dashes produced by punctuation', () => {
    expect(slug('  Eclipse!!  ')).toBe('eclipse');
  });
});

describe('parseLength — real corpus formats', () => {
  it('parses a bare "m" suffix', () => {
    expect(parseLength('88m')).toBe(88);
    expect(parseLength('88 m')).toBe(88);
  });

  it('parses "X m (Y ft)" real fixture format, preferring the meters value', () => {
    // file 20 / file 13: "156 m (511 ft)", "162 m (533 ft)", "180 m (590 ft)"
    expect(parseLength('156 m (511 ft)')).toBe(156);
    expect(parseLength('162 m (533 ft)')).toBe(162);
    expect(parseLength('180 m (590 ft)')).toBe(180);
  });

  it('parses "Xft (Ym)" preferring the meters-in-parens value', () => {
    expect(parseLength('289ft (88m)')).toBe(88);
  });

  it('parses a bare "meters/feet" pair as meters (first number)', () => {
    // file 42: "118.8/390", "85/279", "88/279"
    expect(parseLength('88/279')).toBe(88);
    expect(parseLength('118.8/390')).toBe(118.8);
  });

  it('converts feet-only values to meters', () => {
    expect(parseLength('390 ft')).toBeCloseTo(118.87, 1);
  });

  it('treats a bare number as already-meters', () => {
    expect(parseLength('180')).toBe(180);
  });

  it('returns null for empty/unknown values', () => {
    expect(parseLength('N/A')).toBeNull();
    expect(parseLength('Unknown')).toBeNull();
    expect(parseLength('')).toBeNull();
  });

  it('handles a real ~-prefixed approximate value ("~127m")', () => {
    expect(parseLength('~127m (sail)')).toBe(127);
  });
});

describe('lengthsMatch — ~1m cross-file rounding tolerance', () => {
  it('treats 162 and 162.5 as the same yacht length (file 20 vs file 13 Eclipse)', () => {
    expect(lengthsMatch(162, 162.5)).toBe(true);
  });

  it('treats a >1m difference as a different length', () => {
    expect(lengthsMatch(162, 164)).toBe(false);
  });

  it('returns false when either side is not a number', () => {
    expect(lengthsMatch(162, null)).toBe(false);
    expect(lengthsMatch(null, 162)).toBe(false);
  });
});

describe('parseMoney — real corpus formats', () => {
  it('parses a plain euro amount with thousands separators', () => {
    expect(parseMoney('€650,000')).toEqual({ amount: 650000, currency: 'EUR', raw: '€650,000' });
  });

  it('parses a "+" suffixed amount, ignoring the plus', () => {
    expect(parseMoney('€3,500,000+')).toEqual({
      amount: 3500000,
      currency: 'EUR',
      raw: '€3,500,000+',
    });
  });

  it('parses an amount with a trailing parenthetical note', () => {
    expect(parseMoney('€165,000,000 (sale)')).toEqual({
      amount: 165000000,
      currency: 'EUR',
      raw: '€165,000,000 (sale)',
    });
  });

  it('parses "$X million" / "$X billion" word-multipliers', () => {
    expect(parseMoney('$800 million')).toEqual({
      amount: 800000000,
      currency: 'USD',
      raw: '$800 million',
    });
    expect(parseMoney('$18.4 billion')).toEqual({
      amount: 18400000000,
      currency: 'USD',
      raw: '$18.4 billion',
    });
  });

  it('averages a "$X-Y million" range', () => {
    expect(parseMoney('$50-80 million')).toEqual({
      amount: 65000000,
      currency: 'USD',
      raw: '$50-80 million',
    });
  });

  it('returns null for "Not specified" / "N/A"', () => {
    expect(parseMoney('Not specified')).toBeNull();
    expect(parseMoney('N/A')).toBeNull();
  });

  it('always keeps the raw string even when the number is unparseable', () => {
    expect(parseMoney('Unknown but expensive')).toEqual({
      amount: null,
      currency: null,
      raw: 'Unknown but expensive',
    });
  });

  // Regression (reviewer finding, MEDIUM 2): digit-adjacent M/k/B suffixes
  // (no space, no full word) recur throughout the corpus for running-cost
  // and value columns, e.g. "$100M". The old implementation only recognized
  // whole multiplier *words* ("million"), so "$100M" parsed as amount: 100
  // instead of 100,000,000, and the old /\bk\b/i word-boundary regex could
  // never match a 'k' glued directly to a digit ("25k") at all.
  it('parses a digit-adjacent "M" suffix (no space, no word) as millions', () => {
    expect(parseMoney('$100M')).toEqual({ amount: 100000000, currency: 'USD', raw: '$100M' });
  });

  it('parses a digit-adjacent "k" suffix as thousands', () => {
    expect(parseMoney('€25k')).toEqual({ amount: 25000, currency: 'EUR', raw: '€25k' });
  });

  it('parses a digit-adjacent "B" suffix as billions', () => {
    expect(parseMoney('$1.2B')).toEqual({ amount: 1200000000, currency: 'USD', raw: '$1.2B' });
  });

  it("averages a \"k\"-suffixed range, applying each side's own suffix", () => {
    expect(parseMoney('€25k–€45k/week')).toEqual({
      amount: 35000,
      currency: 'EUR',
      raw: '€25k–€45k/week',
    });
  });
});

describe('parseIntSafe', () => {
  it('parses a plain integer cell', () => {
    expect(parseIntSafe('12')).toBe(12);
  });

  it('takes the leading integer run from a compound cell', () => {
    expect(parseIntSafe('12 guests')).toBe(12);
  });

  it('returns null for empty/unknown cells', () => {
    expect(parseIntSafe('N/A')).toBeNull();
    expect(parseIntSafe('')).toBeNull();
  });
});

describe('parseYear', () => {
  it('parses a plain 4-digit year', () => {
    expect(parseYear('2016')).toBe(2016);
  });

  it('takes the first year out of a combined delivery/refit column', () => {
    // file 42: "Year (Delivery/Refit)" column with values like "2005/2024"
    expect(parseYear('2005/2024')).toBe(2005);
  });

  it('extracts the year out of a refit-annotated cell', () => {
    expect(parseYear('2014 (refit)')).toBe(2014);
  });

  it('returns null for empty/unknown values', () => {
    expect(parseYear('Unknown')).toBeNull();
    expect(parseYear('')).toBeNull();
  });
});

describe('module importability', () => {
  it('exposes the documented named exports', async () => {
    const mod = await import('../src/mappers/normalize.js');
    for (const name of [
      'stripDiacritics',
      'normalizeName',
      'isEmptyValue',
      'slug',
      'parseLength',
      'lengthsMatch',
      'parseMoney',
      'parseIntSafe',
      'parseYear',
    ]) {
      expect(typeof mod[name]).toBe('function');
    }
  });
});
