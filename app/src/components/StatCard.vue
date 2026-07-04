<script setup lang="ts">
import { labelForType, iconForType } from '@/utils/labels';

defineProps<{
  type: string;
  count: number;
}>();
</script>

<template>
  <div class="stat-card">
    <span class="stat-card__icon" aria-hidden="true">{{ iconForType(type) }}</span>
    <div class="stat-card__count">{{ count.toLocaleString() }}</div>
    <div class="stat-card__label">{{ labelForType(type) }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-card__icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.stat-card__count {
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-brand);
}

.stat-card__label {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  margin-top: 0.25rem;
}
</style>
