<script setup lang="ts">
// app/src/components/AttrPanel.vue
//
// TASK-010: type-aware, null-safe attribute grid for EntityView.vue. All
// the formatting logic (nested { value, raw } shapes, money, chips, links)
// lives in utils/attrs.ts — this component just renders whatever entries
// come back, in a clean two-column definition list.
import { computed } from 'vue';
import { buildAttrEntries } from '@/utils/attrs';

const props = defineProps<{ attrs: Record<string, unknown> }>();

const entries = computed(() => buildAttrEntries(props.attrs));
</script>

<template>
  <dl v-if="entries.length" class="attr-panel">
    <template v-for="entry in entries" :key="entry.key">
      <dt class="attr-panel__label">{{ entry.label }}</dt>
      <dd class="attr-panel__value">
        <ul v-if="entry.kind === 'chips'" class="attr-panel__chips">
          <li v-for="(chip, i) in entry.chips" :key="i" class="attr-panel__chip">{{ chip }}</li>
        </ul>
        <a v-else-if="entry.kind === 'link'" :href="entry.href" target="_blank" rel="noopener noreferrer">{{
          entry.text
        }}</a>
        <template v-else>{{ entry.text }}</template>
      </dd>
    </template>
  </dl>
  <p v-else class="attr-panel__empty">No additional details recorded for this entity.</p>
</template>

<style scoped>
.attr-panel {
  display: grid;
  grid-template-columns: minmax(140px, max-content) 1fr;
  gap: 0.6rem 1.5rem;
  margin: 0;
}

.attr-panel__label {
  color: var(--color-text-muted);
  font-weight: 600;
  padding-top: 0.15rem;
}

.attr-panel__value {
  margin: 0;
}

.attr-panel__chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.attr-panel__chip {
  background: var(--color-brand-light);
  color: var(--color-brand);
  border-radius: 999px;
  padding: 0.15rem 0.7rem;
  font-size: 0.85rem;
}

.attr-panel__empty {
  color: var(--color-text-muted);
  font-style: italic;
  margin: 0;
}

@media (max-width: 640px) {
  .attr-panel {
    grid-template-columns: 1fr;
    gap: 0.2rem 0;
  }

  .attr-panel__label {
    padding-top: 0.6rem;
  }
}
</style>
