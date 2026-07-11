<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import GlobalSearch from '@/components/GlobalSearch.vue';
</script>

<template>
  <div class="app-shell">
    <!-- TASK-018: keyboard/screen-reader users can jump straight past the
         header/search/nav chrome to the page's actual content. Visually
         hidden until it receives focus (see .skip-link below). -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <header class="app-header">
      <div class="container app-header__row">
        <RouterLink to="/" class="brand">
          <span class="brand__mark" aria-hidden="true">⚓</span>
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

    <!-- tabindex="-1": not part of the normal tab order (it's a landmark,
         not a control) but focusable programmatically so the skip link
         above actually moves keyboard focus here, not just the viewport. -->
    <main id="main-content" class="app-main" tabindex="-1">
      <RouterView />
    </main>

    <footer class="app-footer">
      <div class="container app-footer__row">
        <p>DataYacht &mdash; a personal Wikipedia for yachts, builders, marinas and the people behind them.</p>
        <RouterLink to="/accessibility" class="app-footer__link">Accessibility</RouterLink>
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

/* TASK-018: visually hidden until focused (Tab from the top of the page),
   then pinned in view so sighted keyboard users can see where focus is. */
.skip-link {
  position: absolute;
  top: -3rem;
  left: 0.75rem;
  z-index: 100;
  background: var(--color-brand);
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 0 0 6px 6px;
  font-weight: 600;
  transition: top 0.1s ease;
}

.skip-link:focus-visible {
  top: 0;
  outline: 2px solid #fff;
  outline-offset: 2px;
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
