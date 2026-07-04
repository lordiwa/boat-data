// app/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import ExploreView from '@/views/ExploreView.vue';
import EntityListView from '@/views/EntityListView.vue';
import EntityView from '@/views/EntityView.vue';
import QueryView from '@/views/QueryView.vue';
import ReportsView from '@/views/ReportsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
  ],
});

export default router;
