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

function barHeight(value: number): number {
  if (value === 0) return 0;
  return (value / maxValue.value) * (plotHeight - 4);
}

function valueLabel(bucket: BarChartVBucket): string {
  return `${formatNumber(bucket.value)}${props.unit ? ` ${props.unit}` : ''}`;
}

function bucketAriaLabel(bucket: BarChartVBucket): string {
  return `${bucket.label}: ${valueLabel(bucket)}${bucket.link ? ' — view matching entries' : ''}`;
}

function activate(bucket: BarChartVBucket) {
  if (!bucket.link) return;
  router.push(bucket.link).catch(() => {});
}
</script>

<template>
  <figure class="bar-chart-v" role="img" :aria-label="title || 'Histogram'">
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
        <text
          :x="BAR_AREA_WIDTH / 2 - 4"
          :y="CHART_HEIGHT - barHeight(bucket.value) - 6"
          text-anchor="middle"
          class="bar-chart-v__value"
        >
          {{ formatNumber(bucket.value) }}
        </text>
        <rect
          :x="8"
          :y="CHART_HEIGHT - barHeight(bucket.value)"
          :width="BAR_AREA_WIDTH - 16"
          :height="barHeight(bucket.value)"
          :fill="BAR_COLOR"
          rx="2"
        />
        <text
          :x="BAR_AREA_WIDTH / 2 - 4"
          :y="CHART_HEIGHT + 18"
          text-anchor="middle"
          class="bar-chart-v__label"
        >
          {{ bucket.label }}
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
