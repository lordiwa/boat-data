// app/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import ExploreView from '@/views/ExploreView.vue';
import EntityListView from '@/views/EntityListView.vue';
import EntityView from '@/views/EntityView.vue';
import QueryView from '@/views/QueryView.vue';
import ReportsView from '@/views/ReportsView.vue';

import AccessibilityView from '@/views/AccessibilityView.vue';
import type { RouteRecordRaw } from 'vue-router';

// TASK-018: exported (not just used inline below) so the a11y audit test
// suite (src/__tests__/a11y.spec.ts) can build its own router instance with
// createMemoryHistory — jsdom supports history.pushState fine, but a shared
// in-memory history per test avoids any cross-test location bleed.
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/explore',
    name: 'explore',
    component: ExploreView,
  },
  {
    // TASK-011: the guided no-SQL query builder — pick an entity type, add
    // attribute/relation filters, see live results. Query state lives in
    // the URL (?type=...&f=...) so it can be bookmarked/shared.
    path: '/query',
    name: 'query',
    component: QueryView,
  },
  {
    // TASK-013: pre-built reports & dashboard — rankings and distributions
    // aggregated over the whole graph, each drilling down to /query or an
    // entity page.
    path: '/reports',
    name: 'reports',
    component: ReportsView,
  },
  {
    // TASK-009: one parameterized, sortable/filterable/paginated list view
    // per node type. EntityListView validates :type itself and renders a
    // friendly message for unknown types.
    path: '/browse/:type',
    name: 'browse',
    component: EntityListView,
    props: true,
  },
  {
    // TASK-008: minimal placeholder entity page (name, type, raw attrs,
    // edges as plain lists) so GlobalSearch results navigate somewhere
    // real. TASK-010 replaces this with the full designed detail view.
    path: '/entity/:id',
    name: 'entity',
    component: EntityView,
    props: true,
  },
  {
    // TASK-018: WCAG 2.1 AA accessibility statement — target level, known
    // limitations, and a contact channel for accessibility issues.
    path: '/accessibility',
    name: 'accessibility',
    component: AccessibilityView,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
