<script setup lang="ts">
// app/src/components/ActiveFilterChips.vue
//
// TASK-030: removable chips for every selected facet value, plus Clear all.
// Removing a chip removes only that value (emit `remove`); Clear all empties
// the whole selection (emit `clear`).
import type { FilterChip } from '@/utils/facets';

defineProps<{ chips: FilterChip[] }>();
defineEmits<{ (e: 'remove', key: string, value: string): void; (e: 'clear'): void }>();
</script>

<template>
  <div v-if="chips.length" class="chips" role="group" aria-label="Active filters">
    <span v-for="chip in chips" :key="`${chip.key}=${chip.value}`" class="chips__chip" :title="chip.title">
      <span>{{ chip.text }}</span>
      <button type="button" class="chips__remove" :aria-label="`Remove filter ${chip.full}`" @click="$emit('remove', chip.key, chip.value)">
        <span aria-hidden="true">&times;</span>
      </button>
    </span>
    <button type="button" class="chips__clear" @click="$emit('clear')">Clear all</button>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.chips__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.2rem 0.1rem 0.7rem;
  border-radius: 999px;
  background: var(--color-brand-light);
  color: var(--color-brand);
  font-size: 0.85rem;
}

.chips__remove {
  font: inherit;
  line-height: 1;
  min-width: 1.5rem;
  min-height: 1.5rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.chips__remove:hover {
  background: rgba(11, 93, 99, 0.15);
}

.chips__clear {
  font: inherit;
  font-size: 0.85rem;
  border: 0;
  background: transparent;
  color: var(--color-brand);
  text-decoration: underline;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
}

.chips__remove:focus-visible,
.chips__clear:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}
</style>
