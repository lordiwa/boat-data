<script setup lang="ts">
// app/src/components/QuickActions.vue
//
// TASK-012: renders the contextual "one-click relationship query" chip row
// on an entity page, right below the header. All the type-aware logic
// (which chips exist, what they point at, when to omit one for missing
// data) lives in the pure, unit-tested utils/quickActions.ts — this
// component is just presentation: a wrapping row of real <router-link>/<a>
// chips (never a <button> with a click handler, so Tab+Enter and
// middle-click/open-in-new-tab both work for free) plus focus styles.
//
// Row-level actions were deliberately NOT added to table views (TASK-009's
// EntityListView/DataTable) — the entity page these chips live on is
// already one click away from any table row via its Name link, so a
// second, per-row action menu would duplicate that path for no gain while
// adding real UI clutter across potentially hundreds of rows.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import { buildQuickActions } from '@/utils/quickActions';
import type { GraphNode } from '@/types/graph';

const props = defineProps<{ node: GraphNode }>();

const graph = useGraphStore();

const actions = computed(() => buildQuickActions(props.node, graph));
</script>

<template>
  <nav v-if="actions.length" class="quick-actions" aria-label="Related queries">
    <template v-for="(action, i) in actions" :key="i">
      <RouterLink v-if="action.kind === 'link'" :to="action.to!" class="quick-actions__chip">
        {{ action.label }}
      </RouterLink>
      <a v-else :href="action.href" class="quick-actions__chip">{{ action.label }}</a>
    </template>
  </nav>
</template>

<style scoped>
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.quick-actions__chip {
  display: inline-block;
  background: var(--color-brand-light);
  color: var(--color-brand);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  border: 1px solid transparent;
  text-decoration: none;
  white-space: normal;
}

.quick-actions__chip:hover {
  background: var(--color-brand);
  color: #fff;
  text-decoration: none;
}

.quick-actions__chip:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .quick-actions__chip {
    flex: 1 1 auto;
    text-align: center;
  }
}
</style>
