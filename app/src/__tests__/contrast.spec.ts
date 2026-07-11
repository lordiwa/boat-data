// app/src/__tests__/contrast.spec.ts
//
// TASK-018: WCAG 2.1 AA (4.5:1, normal text) contrast, computed straight
// from the real color tokens in style.css rather than hand-copied hex
// literals — if someone edits a token later, this test re-derives the
// ratios from the file itself instead of silently checking stale numbers.
//
// axe-core's color-contrast rule needs real layout/paint (to sample
// rendered pixel colors), which jsdom doesn't implement for component
// <style> blocks — see src/__tests__/a11y.spec.ts's header comment for why
// that rule is disabled there. This file is the actual AA-contrast
// regression lock (acceptance criterion: "Text contrast meets 4.5:1 (AA)").
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const styleCssPath = path.resolve(fileURLToPath(import.meta.url), '../../style.css');
const styleCss = readFileSync(styleCssPath, 'utf8');

/** Reads a `--name: #rrggbb;` custom property straight out of style.css's :root block. */
function token(name: string): string {
  const match = styleCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`--${name} not found in style.css — did it get renamed?`);
  return match[1];
}

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, per https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
function relativeLuminance([r, g, b]: Rgb): number {
  const [R, G, B] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio, per https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio */
function contrastRatio(a: Rgb, b: Rgb): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha-blends `fg` over `bg` (both 0-255 RGB), matching how a browser paints a translucent CSS background-color over its parent. */
function blend(bg: Rgb, fg: Rgb, alpha: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(bg[i] * (1 - alpha) + fg[i] * alpha)) as Rgb;
}

const AA_NORMAL_TEXT = 4.5;

describe('WCAG 2.1 AA color contrast (4.5:1, normal text)', () => {
  const bg = hexToRgb(token('color-bg'));
  const surface = hexToRgb(token('color-surface'));
  const text = hexToRgb(token('color-text'));
  const textMuted = hexToRgb(token('color-text-muted'));
  const brand = hexToRgb(token('color-brand'));
  const brandLight = hexToRgb(token('color-brand-light'));
  const accent = hexToRgb(token('color-accent'));
  const accentText = hexToRgb(token('color-accent-text'));

  it('body text (--color-text) on the page background and card surface', () => {
    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('muted text (--color-text-muted) on the page background and card surface', () => {
    expect(contrastRatio(textMuted, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrastRatio(textMuted, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('brand-colored links/headings (--color-brand) on the page background and card surface', () => {
    expect(contrastRatio(brand, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrastRatio(brand, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('brand text on its own light tint background (nav active link, chips, active type-card, "Explore" grid)', () => {
    expect(contrastRatio(brand, brandLight)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('regression lock: plain --color-accent text on its own translucent tint fails AA (documents why --color-accent-text exists)', () => {
    // This is what the "unspecified"/data-quality badges measured before
    // TASK-018's fix. Kept as a negative assertion so nobody swaps the
    // badges/warning chips back to plain --color-accent without
    // reintroducing the failure.
    const tint = blend(surface, accent, 0.12);
    expect(contrastRatio(accent, tint)).toBeLessThan(AA_NORMAL_TEXT);
  });

  it('--color-accent-text on its translucent tint backgrounds (badges, conflicts summary, report note) meets AA', () => {
    // 0.08 / 0.10 / 0.12 are the exact alphas used by
    // ReportsView's .report-card__note, EntityView's .entity__conflicts-summary,
    // and the "unspecified"/data-quality badges (DataTable, GlobalSearch,
    // EntityView), respectively.
    for (const alpha of [0.08, 0.1, 0.12]) {
      const tint = blend(surface, accent, alpha);
      expect(contrastRatio(accentText, tint)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });
});
