// app/src/__tests__/support/axeCanvasStub.ts
//
// TASK-018 review follow-up: axe-core's `label-content-name-mismatch` rule
// (WCAG 2.5.3 — the exact rule that caught BarChartH/V's aria-label bug;
// see those components' TASK-018 comments) calls
// `HTMLCanvasElement.getContext('2d')` internally, as part of a heuristic
// that excludes icon-ligature-font glyphs (e.g. Material Icons text used as
// an icon) from the "visible text" it compares against an element's
// accessible name. jsdom doesn't implement canvas without the native
// `canvas` npm package (a Cairo-backed native binary — deliberately not
// added here; fragile to build in CI, especially on Windows). Without a 2D
// context, axe can't even evaluate the rule at all: it errors per-node into
// `incomplete` (not `violations`), silently giving no pass/fail signal.
//
// This is NOT a real canvas polyfill — it's the minimum fake pixel data
// that makes axe's heuristic conclude "this is real, per-character text,
// not a ligature", so the rule's actual (real, useful) label-vs-content
// comparison runs for real. Verified empirically: with this stub installed,
// axe both (a) passes our real, fixed chart markup and (b) genuinely
// flags a deliberately reintroduced mismatch (see chartLabelMismatch.spec.ts).
export function installAxeCanvasStub(): () => void {
  const original = HTMLCanvasElement.prototype.getContext;
  let callCount = 0;

  // @ts-expect-error — deliberately not a full CanvasRenderingContext2D;
  // only the members axe-core's _isIconLigature() actually calls.
  HTMLCanvasElement.prototype.getContext = function fakeGetContext() {
    return {
      canvas: {},
      font: '',
      textAlign: '',
      textBaseline: '',
      // axe compares the sum of per-character widths against the whole
      // string's measured width to detect a ligature (a font collapsing N
      // characters into 1 glyph would shrink the whole-string width well
      // below that sum). A plain length-proportional width always agrees
      // with itself — i.e. "not a ligature", which is true for every real
      // string this app renders (plain sans-serif labels/numbers).
      measureText: (s: string) => ({ width: Math.max(1, s.length * 10) }),
      fillText: () => {},
      clearRect: () => {},
      // axe draws the first character alone, then the whole string, and
      // diffs the two pixel buffers — identical buffers would mean "adding
      // more characters didn't change the rendered glyph", i.e. a
      // ligature. Alternating an all-transparent fill then an all-opaque
      // fill makes every pixel differ between the two draws, i.e. "not a
      // ligature" — the correct answer for this app's real text.
      getImageData: (_x: number, _y: number, w: number, h: number) => {
        callCount += 1;
        const fill = callCount % 2 === 1 ? 0x00 : 0xff;
        return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)).fill(fill) };
      },
    };
  };

  return () => {
    HTMLCanvasElement.prototype.getContext = original;
  };
}
