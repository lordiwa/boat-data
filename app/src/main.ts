// app/src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useGraphStore } from './stores/graph';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Kick off the graph fetch immediately; components read store.loaded /
// store.error to render loading/error states rather than awaiting here.
const graphStore = useGraphStore(pinia);
graphStore.load().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[graph] failed to load graph.json', err);
});

app.mount('#app');
