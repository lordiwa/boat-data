<script setup lang="ts">
// app/src/components/charts/BarChartV.vue
//
// TASK-013: hand-rolled vertical bar chart for distributions/histograms
// (e.g. charter-rate bands, build decades) — short categorical bucket labels
// read fine left-to-right along the x-axis, so vertical bars (rather than
// horizontal) keep the report's shape ("distribution over an ordered axis")
// visually obvious.
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { formatNumber } from '@/utils/format';

export interface BarChartVBucket {
  label: string;
  value: number;
  link?: RouteLocationRaw;
}

const props = withDefaults(
  defineProps<{
    buckets: BarChartVBucket[];
    unit?: string;
    title?: string;
    description?: string;
  }>(),
  {
    unit: '',
  },
);

const router = useRouter();

// Same single categorical color as BarChartH — one consistent palette
// across every chart in the dashboard.
const BAR_COLOR = '#2563eb';

const CHART_HEIGHT = 200;
const BAR_AREA_WIDTH = 60;
const AXIS_GUTTER_LEFT = 36;
const AXIS_GUTTER_BOTTOM = 46;
const VALUE_LABEL_GAP = 18;

const maxValue = computed(() => Math.max(1, ...props.buckets.map((b) => b.value)));
const totalWidth = computed(() => AXIS_GUTTER_LEFT + Math.max(1, props.buckets.length) * BAR_AREA_WIDTH + 16);
const totalHeight = CHART_HEIGHT + AXIS_GUTTER_BOTTOM;
const plotHeight = CHART_HEIGHT - VALUE_LABEL_GAP;

// TASK-018: see BarChartH.vue's identical comment — role="img" and a real
// focusable, role="link" descendant are a genuine conflict (axe:
// nested-interactive), not just a lint nit: an "image" role isn't supposed
// to expose interactive children to assistive tech at all. Use a labelled
// group instead whenever any bucket links somewhere.
const hasLinks = computed(() => props.buckets.some((b) => !!b.link));

function barHeight(value: number): number {
  if (value === 0) return 0;
  return (value / maxValue.value) * (plotHeight - 4);
}

function valueLabel(bucket: BarChartVBucket): string {
  return `${formatNumber(bucket.value)}${props.unit ? ` ${props.unit}` : ''}`;
}

function bucketAriaLabel(bucket: BarChartVBucket): string {
  // TASK-018: no colon — see the matching comment on the <text> elements
  // above and BarChartH.vue's identical rowAriaLabel fix.
  return `${bucket.label} ${valueLabel(bucket)}${bucket.link ? ' — view matching entries' : ''}`;
}

function activate(bucket: BarChartVBucket) {
  if (!bucket.link) return;
  router.push(bucket.link).catch(() => {});
}
</script>

<template>
  <figure class="bar-chart-v" :role="hasLinks ? 'group' : 'img'" :aria-label="title || 'Histogram'">
    <svg
      :viewBox="`0 0 ${totalWidth} ${totalHeight}`"
      :width="totalWidth"
      :height="totalHeight"
      preserveAspectRatio="xMinYMin meet"
      class="bar-chart-v__svg"
    >
      <title>{{ title || 'Histogram' }}</title>
      <desc>{{ description || `Distribution histogram, values in ${unit || 'units'}` }}</desc>

      <!-- y-axis unit label -->
      <text
        v-if="unit"
        :x="4"
        :y="12"
        class="bar-chart-v__unit"
      >
        {{ unit }}
      </text>

      <!-- baseline -->
      <line
        :x1="AXIS_GUTTER_LEFT"
        :y1="CHART_HEIGHT"
        :x2="totalWidth - 8"
        :y2="CHART_HEIGHT"
        class="bar-chart-v__axis"
      />

      <g
        v-for="(bucket, index) in buckets"
        :key="bucket.label + index"
        :transform="`translate(${AXIS_GUTTER_LEFT + index * BAR_AREA_WIDTH}, 0)`"
        :class="{ 'bar-chart-v__col--linked': !!bucket.link }"
        class="bar-chart-v__col"
        :tabindex="bucket.link ? 0 : undefined"
        :role="bucket.link ? 'link' : undefined"
        :aria-label="bucketAriaLabel(bucket)"
        @click="activate(bucket)"
        @keydown.enter="activate(bucket)"
        @keydown.space.prevent="activate(bucket)"
      >
        <title>{{ bucketAriaLabel(bucket) }}</title>
        <!-- TASK-018: label <text> before the value <text> in document order
             (was value-then-label) so the two visible text nodes read
             contiguously as "{label} {value}", matching bucketAriaLabel
             below — WCAG 2.5.3 / axe's label-content-name-mismatch expects
             the accessible name to contain the element's visible text
             verbatim, in DOM order. Reordering these two absolutely
             positioned (x/y) elements doesn't move either one on screen.
             The "&#32;" after this <text>'s closing tag is a literal space
             *text node*, deliberately outside any <text>/<tspan> (so SVG
             never paints it) — see BarChartH.vue's identical comment for
             why it's needed for axe to see "{label} {value}" as one run. -->
        <text
          :x="BAR_AREA_WIDTH / 2 - 4"
          :y="CHART_HEIGHT + 18"
          text-anchor="middle"
          class="bar-chart-v__label"
        >
          {{ bucket.label }}
        </text>&#32;<rect
          :x="8"
          :y="CHART_HEIGHT - barHeight(bucket.value)"
          :width="BAR_AREA_WIDTH - 16"
          :height="barHeight(bucket.value)"
          :fill="BAR_COLOR"
          rx="2"
        />
        <text
          :x="BAR_AREA_WIDTH / 2 - 4"
          :y="CHART_HEIGHT - barHeight(bucket.value) - 6"
          text-anchor="middle"
          class="bar-chart-v__value"
        >
          {{ formatNumber(bucket.value) }}
        </text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.bar-chart-v {
  margin: 0;
  width: 100%;
  overflow-x: auto;
}

.bar-chart-v__svg {
  max-width: 100%;
  height: auto;
  font-family: var(--font-sans);
}

.bar-chart-v__axis {
  stroke: var(--color-border);
  stroke-width: 1;
}

.bar-chart-v__unit {
  font-size: 10px;
  fill: var(--color-text-muted);
}

.bar-chart-v__label {
  font-size: 10px;
  fill: var(--color-text);
}

.bar-chart-v__value {
  font-size: 10px;
  fill: var(--color-text-muted);
  font-weight: 600;
}

.bar-chart-v__col--linked {
  cursor: pointer;
}

.bar-chart-v__col--linked:hover .bar-chart-v__label,
.bar-chart-v__col--linked:focus-visible .bar-chart-v__label {
  text-decoration: underline;
}

.bar-chart-v__col--linked:focus-visible rect {
  outline: 2px solid var(--color-brand);
  outline-offset: 1px;
}
</style>
