// app/src/utils/__tests__/attrs.spec.ts
//
// TASK-021 (closing a TASK-020 reviewer MEDIUM: this file didn't exist —
// the data_quality-hiding/meters-formatting/label-override behavior added
// in TASK-020 had no direct unit test). Locks buildAttrEntries()/
// labelForAttrKey()'s handling of the TASK-020 additions.
import { describe, it, expect } from 'vitest';
import { buildAttrEntries, labelForAttrKey } from '../attrs';

describe('buildAttrEntries — TASK-020 data_quality handling', () => {
  it('hides data_quality from the generic attr grid entirely (EntityView.vue renders it as a separate warning banner instead)', () => {
    const entries = buildAttrEntries({
      name: 'RIO',
      data_quality: 'unverified — no matching real vessel found (2026-07 research pass)',
    });
    expect(entries.find((e) => e.key === 'data_quality')).toBeUndefined();
  });
});

describe('buildAttrEntries — TASK-020 meters-formatted fields (beam/draft/max_draft)', () => {
  it('formats beam as meters, same shape as loa/max_loa', () => {
    const entries = buildAttrEntries({ beam: { meters: 20.8, raw: '20.8' } });
    const entry = entries.find((e) => e.key === 'beam');
    expect(entry?.kind).toBe('text');
    expect(entry?.text).toContain('20.8');
  });

  it('formats draft as meters', () => {
    const entries = buildAttrEntries({ draft: { meters: 4.3, raw: '4.3' } });
    const entry = entries.find((e) => e.key === 'draft');
    expect(entry?.kind).toBe('text');
    expect(entry?.text).toContain('4.3');
  });

  it('formats max_draft as meters (marinaMapper.js)', () => {
    const entries = buildAttrEntries({ max_draft: { meters: 10, raw: '10' } });
    const entry = entries.find((e) => e.key === 'max_draft');
    expect(entry?.kind).toBe('text');
    expect(entry?.text).toContain('10');
  });

  it('omits beam/draft/max_draft entirely when the nested record is blank', () => {
    const entries = buildAttrEntries({ beam: { meters: null, raw: null }, draft: null, max_draft: undefined });
    expect(entries.find((e) => e.key === 'beam')).toBeUndefined();
    expect(entries.find((e) => e.key === 'draft')).toBeUndefined();
    expect(entries.find((e) => e.key === 'max_draft')).toBeUndefined();
  });
});

describe('buildAttrEntries — TASK-020 plain-value spec fields render generically', () => {
  it('renders gt/max_speed/range_nm as plain numbers', () => {
    const entries = buildAttrEntries({ gt: 13136, max_speed: 32, range_nm: 8500 });
    expect(entries.find((e) => e.key === 'gt')?.text).toBe('13,136');
    expect(entries.find((e) => e.key === 'max_speed')?.text).toBe('32');
    expect(entries.find((e) => e.key === 'range_nm')?.text).toBe('8,500');
  });

  it('renders flag/class_society/imo as plain text', () => {
    const entries = buildAttrEntries({ flag: 'Cayman Islands', class_society: "Lloyd's Register", imo: '9693367' });
    expect(entries.find((e) => e.key === 'flag')?.text).toBe('Cayman Islands');
    expect(entries.find((e) => e.key === 'class_society')?.text).toBe("Lloyd's Register");
    expect(entries.find((e) => e.key === 'imo')?.text).toBe('9693367');
  });

  it('renders former_names as chips', () => {
    const entries = buildAttrEntries({ former_names: ['Topaz'] });
    const entry = entries.find((e) => e.key === 'former_names');
    expect(entry?.kind).toBe('chips');
    expect(entry?.chips).toEqual(['Topaz']);
  });
});

describe('labelForAttrKey — TASK-020 label overrides', () => {
  it('uses the new spec-field label overrides', () => {
    expect(labelForAttrKey('gt')).toBe('GT');
    expect(labelForAttrKey('max_speed')).toBe('Max speed (kn)');
    expect(labelForAttrKey('range_nm')).toBe('Range (nm)');
    expect(labelForAttrKey('class_society')).toBe('Class society');
    expect(labelForAttrKey('imo')).toBe('IMO number');
    expect(labelForAttrKey('former_names')).toBe('Former names');
    expect(labelForAttrKey('max_draft')).toBe('Max draft');
  });

  it('falls back to a humanized guess for an unknown key', () => {
    expect(labelForAttrKey('some_new_field')).toBe('Some new field');
  });
});
