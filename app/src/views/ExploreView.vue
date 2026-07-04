<script setup lang="ts">
// app/src/views/ExploreView.vue
//
// TASK-009: the Explore hub — one card per node type, each linking to that
// type's sortable/filterable/paginated list at /browse/:type. Reuses
// StatCard (from the home page's stat grid) rather than inventing a new
// card component just to add a link.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import StatCard from '@/components/StatCard.vue';

const graph = useGraphStore();

// Yachts first (the primary entity), then the other kinds roughly by how a
// reader would encounter them while exploring a yacht's page. Any type not
// listed here (e.g. one added upstream later) is appended at the end so
// the grid never silently drops data.
const PREFERRED_ORDER = ['yacht', 'builder', 'designer', 'engine', 'person', 'club', 'marina', 'company', 'region'];

const orderedTypeCounts = computed<Array<[string, number]>>(() => {
  const entries = Object.entries(graph.typeCounts);
  const known = PREFERRED_ORDER.filter((t) => t in graph.typeCounts).map(
    (t) => [t, graph.typeCounts[t]] as [string, number],
  );
  const rest = entries.filter(([t]) => !PREFERRED_ORDER.includes(t));
  return [...known, ...rest];
});
</script>

<template>
  <div class="explore container">
    <section class="explore__intro">
      <h1>Explore</h1>
      <p v-if="graph.loaded">
        Browse every entity in the graph &mdash; {{ graph.nodeCount.toLocaleString() }} nodes across
        {{ orderedTypeCounts.length }} types. Pick a type below to sort, filter and page through the full list.
      </p>
      <p v-else-if="graph.error">Could not load the graph: {{ graph.error }}</p>
      <p v-else>Loading the knowledge graph&hellip;</p>
    </section>

    <section v-if="graph.loaded" class="explore__grid" aria-label="Browse by entity type">
      <RouterLink
        v-for="[type, count] in orderedTypeCounts"
        :key="type"
        :to="`/browse/${type}`"
        class="explore__card-link"
      >
        <StatCard :type="type" :count="count" />
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.explore {
  padding: 3rem 1.5rem 4rem;
}

.explore__intro {
  max-width: 720px;
  margin: 0 auto 2rem;
  text-align: center;
}

.explore__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.explore__card-link {
  color: inherit;
  text-decoration: none;
  display: block;
}

.explore__card-link:hover {
  text-decoration: none;
}
</style>
