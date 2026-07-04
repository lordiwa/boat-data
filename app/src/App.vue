<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import GlobalSearch from '@/components/GlobalSearch.vue';
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="container app-header__row">
        <RouterLink to="/" class="brand">
          <span class="brand__mark">⚓</span>
          <span class="brand__name">DataYacht</span>
        </RouterLink>
        <GlobalSearch class="app-header__search" />
        <nav class="app-nav" aria-label="Primary">
          <RouterLink to="/" class="app-nav__link">Home</RouterLink>
          <RouterLink to="/explore" class="app-nav__link">Explore</RouterLink>
          <RouterLink to="/query" class="app-nav__link">Query</RouterLink>
          <RouterLink to="/reports" class="app-nav__link">Reports</RouterLink>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <div class="container">
        <p>DataYacht &mdash; a personal Wikipedia for yachts, builders, marinas and the people behind them.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 64px;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.app-header__search {
  order: 2;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}

.brand:hover {
  text-decoration: none;
  color: var(--color-brand);
}

.brand__mark {
  font-size: 1.1rem;
}

.app-nav {
  display: flex;
  gap: 1.5rem;
  order: 3;
}

.app-nav__link {
  color: var(--color-text-muted);
  font-weight: 500;
  padding: 0.35rem 0;
  border-bottom: 2px solid transparent;
}

.app-nav__link:hover {
  color: var(--color-text);
  text-decoration: none;
}

.app-nav__link.router-link-exact-active {
  color: var(--color-brand);
  border-bottom-color: var(--color-brand);
}

.app-main {
  flex: 1;
}

.app-footer {
  border-top: 1px solid var(--color-border);
  padding: 1.5rem 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.app-footer p {
  margin: 0;
}
</style>
