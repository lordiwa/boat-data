<script setup lang="ts">
import { computed } from 'vue';
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
  <div class="home container">
    <section class="hero">
      <h1>A personal Wikipedia for yachts</h1>
      <p class="hero__subtitle" v-if="graph.loaded">
        Explore <strong>{{ graph.nodeCount.toLocaleString() }}</strong> entities and
        <strong>{{ graph.edgeCount.toLocaleString() }}</strong> relationships &mdash; yachts, the builders who made
        them, the marinas that host them, and the people and clubs behind them.
      </p>
      <p class="hero__subtitle" v-else-if="graph.error">Could not load the graph: {{ graph.error }}</p>
      <p class="hero__subtitle" v-else>Loading the knowledge graph&hellip;</p>
    </section>

    <section v-if="graph.loaded" class="stats" aria-label="Entity counts by type">
      <StatCard v-for="[type, count] in orderedTypeCounts" :key="type" :type="type" :count="count" />
    </section>
  </div>
</template>

<style scoped>
.home {
  padding: 3rem 1.5rem 4rem;
}

.hero {
  max-width: 720px;
  margin: 0 auto 2.5rem;
  text-align: center;
}

.hero h1 {
  font-size: 2.25rem;
  margin-bottom: 0.75rem;
}

.hero__subtitle {
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}
</style>
