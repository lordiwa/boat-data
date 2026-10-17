<script setup lang="ts">
// TASK-034: Home is the landing page (what DataYacht is + routes to the tools).
// Explore stays the browsing hub. Every figure comes from the loaded graph.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import { requestSearchFocus } from '@/composables/searchFocus';

const graph = useGraphStore();

/** The six tiles, in display order, with what data each type carries. */
const TILES: Array<{ type: string; label: string; blurb: string }> = [
  { type: 'yacht', label: 'Yachts', blurb: 'Length, year, builder, flag, owner and size class.' },
  { type: 'marina', label: 'Marinas', blurb: 'Location, berths, maximum LOA, services and facility type.' },
  { type: 'shipyard', label: 'Shipyards', blurb: 'Dry docks, lifts and capacity.' },
  { type: 'builder', label: 'Builders', blurb: 'Country, segment and year founded.' },
  { type: 'club', label: 'Yacht clubs', blurb: 'City, year founded and facilities.' },
  { type: 'company', label: 'Companies', blurb: 'Kind of business and locations.' },
];

// A type absent from the graph is omitted, never shown as 0.
const tiles = computed(() =>
  TILES.filter((t) => (graph.typeCounts[t.type] ?? 0) > 0).map((t) => ({ ...t, count: graph.typeCounts[t.type] })),
);

const geoCountries = computed(() => {
  const list: unknown = graph.meta?.geo?.countries;
  return Array.isArray(list) ? list : [];
});

/** Countries with a usable code and count, one per ISO code, biggest first (a malformed entry is skipped, never thrown on). */
const validCountries = computed(() => {
  const seen = new Set<string>();
  const out: Array<{ iso2: string; name: string; count: number }> = [];
  for (const c of geoCountries.value as Array<Record<string, unknown> | null>) {
    const iso2 = typeof c?.iso2 === 'string' ? c.iso2.trim().toUpperCase() : '';
    const count = c?.node_count;
    if (!/^[A-Z]{2}$/.test(iso2) || seen.has(iso2) || typeof count !== 'number' || !Number.isFinite(count)) continue;
    seen.add(iso2);
    out.push({ iso2, name: typeof c?.name === 'string' && c.name ? c.name : iso2, count });
  }
  return out.sort((a, b) => b.count - a.count);
});

const countryCount = computed(() => validCountries.value.length);

/** Loaded and non-empty: only then are the figures, tiles and coverage meaningful. */
const hasData = computed(() => graph.loaded && graph.nodeCount > 0);

/** Browse list of the type with most nodes in the country, or null when no geo type has any (nothing to link to). */
function dominantType(iso2: string): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const type of Object.keys(graph.typeCounts)) {
    const index = graph.facetIndex(type);
    if (!index.hasGeo) continue;
    const n = index.facets.get('country')?.get(iso2)?.size ?? 0;
    if (n > bestCount) {
      best = type;
      bestCount = n;
    }
  }
  return best;
}

/** Top five countries by node count that actually have a filtered list to open. */
const coverage = computed(() => {
  const out: Array<{ iso2: string; name: string; count: number; to: { path: string; query: { country: string } } }> = [];
  if (!hasData.value) return out;
  for (const c of validCountries.value) {
    const type = dominantType(c.iso2);
    if (!type) continue;
    out.push({ ...c, to: { path: `/browse/${type}`, query: { country: c.iso2 } } });
    if (out.length === 5) break;
  }
  return out;
});
</script>

<template>
  <div class="home container">
    <section class="hero" aria-labelledby="home-title">
      <h1 id="home-title">DataYacht</h1>
      <p class="hero__lead">
        An open, cross-linked knowledge graph of yachts, shipyards, marinas, clubs, people and engines.
      </p>
      <p v-if="graph.error" class="hero__status" role="alert">Could not load the graph: {{ graph.error }}</p>
      <p v-else-if="!graph.loaded" class="hero__status">Loading the knowledge graph&hellip;</p>
      <p v-else-if="!hasData" class="hero__status">The knowledge graph has no data yet.</p>
      <div class="hero__ctas">
        <RouterLink to="/explore" class="cta cta--primary">Explore the graph</RouterLink>
        <button type="button" class="cta cta--secondary" @click="requestSearchFocus">Search by name or place</button>
        <RouterLink to="/query" class="cta cta--secondary">Open the query builder</RouterLink>
      </div>
    </section>

    <section v-if="hasData" class="block" aria-labelledby="home-inside">
      <h2 id="home-inside">What is inside</h2>
      <p class="figures">
        <strong>{{ graph.nodeCount.toLocaleString() }}</strong> nodes,
        <strong>{{ graph.edgeCount.toLocaleString() }}</strong> edges and
        <strong>{{ countryCount.toLocaleString() }}</strong> countries.
      </p>
      <ul class="tiles">
        <li v-for="t in tiles" :key="t.type" class="tile" :data-type="t.type">
          <h3 class="tile__title">{{ t.label }}</h3>
          <p class="tile__count">{{ t.count.toLocaleString() }}</p>
          <p class="tile__blurb">{{ t.blurb }}</p>
        </li>
      </ul>
    </section>

    <section class="block" aria-labelledby="home-how">
      <h2 id="home-how">How to use it</h2>
      <ol class="steps">
        <li>
          <RouterLink to="/explore">Browse by type</RouterLink> and filter by country, state and category.
        </li>
        <li>
          <button type="button" class="linkish" @click="requestSearchFocus">Search any name or place</button>
          from the box at the top of every page.
        </li>
        <li><RouterLink to="/query">Build a query</RouterLink> with filters, no code needed.</li>
      </ol>
    </section>

    <section class="block" aria-labelledby="home-data">
      <h2 id="home-data">Where the data comes from</h2>
      <p>
        DataYacht combines a curated research corpus with automated ingestion. It never guesses: an empty field is
        better than an invented one. Yacht pages carry a complete-profile indicator that shows how much of a profile
        is filled in. Read how the site supports every reader in the
        <RouterLink to="/accessibility">accessibility statement</RouterLink>.
      </p>
    </section>

    <section v-if="coverage.length" class="block" aria-labelledby="home-coverage">
      <h2 id="home-coverage">Coverage</h2>
      <p>Top countries by number of entities.</p>
      <ul class="coverage">
        <li v-for="c in coverage" :key="c.iso2">
          <RouterLink :to="c.to" class="coverage__link">
            <span>{{ c.name }}</span>
            <span class="coverage__count">{{ c.count.toLocaleString() }} entities</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section class="closing" aria-labelledby="home-closing">
      <h2 id="home-closing">Ready to look around?</h2>
      <RouterLink to="/explore" class="cta cta--primary">Start exploring</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding: 2rem 1rem 4rem;
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

.hero__lead {
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

.hero__status {
  color: var(--color-text-muted);
}

.hero__ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cta {
  display: inline-block;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-brand);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.cta:hover {
  text-decoration: none;
}

.cta--primary {
  background: var(--color-brand);
  color: #fff;
}

.cta--secondary {
  background: var(--color-surface);
  color: var(--color-brand);
}

.block {
  max-width: 960px;
  margin: 0 auto 2.5rem;
}

.figures {
  font-size: 1.1rem;
}

.tiles,
.coverage {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.tile {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 1rem;
}

.tile__title {
  font-size: 1rem;
  margin: 0;
  color: var(--color-text-muted);
}

.tile__count {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0.25rem 0;
  color: var(--color-brand);
}

.tile__blurb {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.steps {
  padding-left: 1.25rem;
}

/* In-text links must not rely on colour alone (Lighthouse link-in-text-block). */
.steps a,
.block p a {
  text-decoration: underline;
}

.steps li {
  margin-bottom: 0.5rem;
}

.linkish {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-brand);
  text-decoration: underline;
  cursor: pointer;
}

.coverage {
  display: grid;
  gap: 0.5rem;
}

.coverage__link {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
}

.coverage__link > span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.coverage__link:hover {
  text-decoration: none;
  border-color: var(--color-brand);
}

.coverage__count {
  color: var(--color-text-muted);
}

.closing {
  text-align: center;
}
</style>
