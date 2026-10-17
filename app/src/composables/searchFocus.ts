// TASK-034: tiny bridge so any view (the Home "Search" CTA) can ask the header's GlobalSearch
// to take focus without importing it. GlobalSearch watches `searchFocusRequest`.
import { ref } from 'vue';

export const searchFocusRequest = ref(0);

export function requestSearchFocus(): void {
  searchFocusRequest.value += 1;
}
