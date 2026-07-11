<script setup lang="ts">
// app/src/components/charts/BarChartH.vue
//
// TASK-013: hand-rolled horizontal bar chart for ranked categories (e.g. "top
// builders by # yachts") — no charting library, to keep the bundle lean and
// match the rest of the app's hand-rolled style. Horizontal bars are used
// (rather than vertical) because these labels (builder/marina/yacht names)
// are long and read far better left-to-right than rotated on a vertical axis.
//
// Accessibility: the whole chart has an SVG <title>/<desc> pair (read by
// screen readers as the accessible name/description), each bar has its own
// <title> (native hover tooltip with the exact value) and, when linked, is a
// keyboard-focusable, Enter/Space-activatable element via a real
// <RouterLink> rendered as an SVG foreignObject-free <a> substitute (a
// focusable <g> that navigates on click/keydown, since SVG's native <a>
// doesn't reliably participate in Vue Router's history-mode navigation).
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { formatNumber } from '@/utils/format';

export interface BarChartHItem {
  label: string;
  value: number;
  link?: RouteLocationRaw;
}

const props = withDefaults(
  defineProps<{
    items: BarChartHItem[];
    unit?: string;
    maxBars?: number;
    title?: string;
    description?: string;
  }>(),
  {
    unit: '',
    maxBars: 15,
  },
);

const router = useRouter();

// Single consistent categorical color across every chart in the dashboard
// (see .claude dataviz conventions): a blue with AA contrast on white,
// used for every single-series bar so the palette reads as one visual
// language across all reports rather than a different hue per card.
const BAR_COLOR = '#2563eb';

const ROW_HEIGHT = 28;
const BAR_H = 16;
const LABEL_WIDTH = 170;
const CHART_WIDTH = 460;
const VALUE_GUTTER = 60;
const TOTAL_WIDTH = LABEL_WIDTH + CHART_WIDTH + VALUE_GUTTER;

const visibleItems = computed(() => props.items.slice(0, props.maxBars));
const maxValue = computed(() => Math.max(1, ...visibleItems.value.map((i) => i.value)));
const totalHeight = computed(() => Math.max(1, visibleItems.value.length) * ROW_HEIGHT + 8);

// TASK-018: role="img" tells assistive tech "treat this whole subtree as one
// atomic, non-interactive picture" — appropriate when every bar is
// non-interactive (a plain histogram/ranking with no drill-down), but a
// genuine conflict (axe: nested-interactive) once any bar is a real,
// keyboard-focusable link: an "image" isn't supposed to expose focusable
// descendants at all, so those links could be announced inconsistently or
// skipped entirely depending on the screen reader. When any bar links
// somewhere, the figure is a labelled *group* instead — group semantics
// don't collapse their children, so each linked bar's own role="link" and
// accessible name (rowAriaLabel) are exposed normally, while the SVG's
// <title>/<desc> still provide the chart's overall description.
const hasLinks = computed(() => visibleItems.value.some((i) => !!i.link));

function barWidth(value: number): number {
  return (value / maxValue.value) * CHART_WIDTH;
}

function valueLabel(item: BarChartHItem): string {
  return `${formatNumber(item.value)}${props.unit ? ` ${props.unit}` : ''}`;
}

function rowAriaLabel(item: BarChartHItem): string {
  // TASK-018: no colon between label and value — the row's two visible SVG
  // <text> nodes render as "{label}" then "{value}" back to back with
  // nothing between them, and WCAG 2.5.3 (Label in Name) / axe's
  // label-content-name-mismatch expects the accessible name to contain that
  // visible text verbatim, not a punctuated paraphrase of it.
  return `${item.label} ${valueLabel(item)}${item.link ? ' — view matching entries' : ''}`;
}

function activate(item: BarChartHItem) {
  if (!item.link) return;
  router.push(item.link).catch(() => {});
}
</script>

<template>
  <figure class="bar-chart-h" :role="hasLinks ? 'group' : 'img'" :aria-label="title || 'Bar chart'">
    <svg
      :viewBox="`0 0 ${TOTAL_WIDTH} ${totalHeight}`"
      :width="TOTAL_WIDTH"
      :height="totalHeight"
      preserveAspectRatio="xMinYMin meet"
      class="bar-chart-h__svg"
    >
      <title>{{ title || 'Bar chart' }}</title>
      <desc>{{ description || `Horizontal bar chart, values in ${unit || 'units'}` }}</desc>

      <g
        v-for="(item, index) in visibleItems"
        :key="item.label + index"
        :transform="`translate(0, ${index * ROW_HEIGHT + 4})`"
        :class="{ 'bar-chart-h__row--linked': !!item.link }"
        class="bar-chart-h__row"
        :tabindex="item.link ? 0 : undefined"
        :role="item.link ? 'link' : undefined"
        :aria-label="rowAriaLabel(item)"
        @click="activate(item)"
        @keydown.enter="activate(item)"
        @keydown.space.prevent="activate(item)"
      >
        <title>{{ rowAriaLabel(item) }}</title>
        <!-- TASK-018: the "&#32;" right after this <text>'s closing tag is a
             single literal space *text node*, deliberately not inside any
             <text>/<tspan> — SVG never paints text nodes outside those, so
             it's visually inert — sitting between the label and value text
             so axe-core's (real, DOM-walking, not layout-based)
             visible-text extraction sees "{label} {value}" with a space,
             matching rowAriaLabel below. Vue's whitespace condensing would
             otherwise collapse/drop the newline-formatted whitespace that's
             actually in this template, joining the two into "labelvalue"
             with nothing between them (axe: label-content-name-mismatch). -->
        <text
          :x="LABEL_WIDTH - 8"
          :y="BAR_H / 2 + 4"
          text-anchor="end"
          class="bar-chart-h__label"
        >
          {{ item.label }}
        </text>&#32;<rect
          :x="LABEL_WIDTH"
          y="0"
          :width="Math.max(1, barWidth(item.value))"
          :height="BAR_H"
          :fill="BAR_COLOR"
          rx="2"
        />
        <text
          :x="LABEL_WIDTH + Math.max(1, barWidth(item.value)) + 8"
          :y="BAR_H / 2 + 4"
          class="bar-chart-h__value"
        >
          {{ valueLabel(item) }}
        </text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.bar-chart-h {
  margin: 0;
  width: 100%;
  overflow-x: auto;
}

.bar-chart-h__svg {
  max-width: 100%;
  height: auto;
  font-family: var(--font-sans);
}

.bar-chart-h__label {
  font-size: 11px;
  fill: var(--color-text);
}

.bar-chart-h__value {
  font-size: 11px;
  fill: var(--color-text-muted);
  font-weight: 600;
}

.bar-chart-h__row--linked {
  cursor: pointer;
}

.bar-chart-h__row--linked:hover .bar-chart-h__label,
.bar-chart-h__row--linked:focus-visible .bar-chart-h__label {
  text-decoration: underline;
}

.bar-chart-h__row--linked:focus-visible rect {
  outline: 2px solid var(--color-brand);
  outline-offset: 1px;
}
</style>
