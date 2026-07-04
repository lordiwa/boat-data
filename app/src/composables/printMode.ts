// app/src/composables/printMode.ts
//
// TASK-014: a single module-level (singleton) flag flipped on by any
// results table's "Print view" button and read by DataTable.vue itself
// (to swap its own pagination off in favor of every filtered/sorted row,
// and to render its print-only title block) as well as by host views that
// have their own builder chrome to hide (QueryView's type picker/filter
// rows, for instance). A shared ref — rather than a prop threaded through
// every view and every DataTable instance on the page — keeps print
// behavior consistent across /browse, /query, /reports and entity pages
// without each one re-implementing the toggle.
import { nextTick, ref } from 'vue';

export const printMode = ref(false);

let listenerAttached = false;

function restore() {
  printMode.value = false;
}

/**
 * Turns print mode on, waits a tick for Vue to patch the DOM (all rows
 * rendered, chrome hidden) before the browser paints, then opens the
 * browser's print dialog. Restoration happens on the `afterprint` event —
 * which fires whether the user printed or cancelled — rather than
 * synchronously after `window.print()` returns, since that call doesn't
 * reliably block until the dialog closes across every browser.
 */
export async function triggerPrint(): Promise<void> {
  if (!listenerAttached && typeof window !== 'undefined') {
    window.addEventListener('afterprint', restore);
    listenerAttached = true;
  }
  printMode.value = true;
  await nextTick();
  window.print();
}
