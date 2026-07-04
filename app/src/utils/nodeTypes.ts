// app/src/utils/nodeTypes.ts
//
// TASK-009: the known node types, used by EntityListView.vue to validate the
// `:type` route param before trusting it (an unknown/mistyped type in the
// URL should render a friendly message, not a blank table or a crash).
import type { NodeType } from '@/types/graph';

export const KNOWN_NODE_TYPES: NodeType[] = [
  'yacht',
  'builder',
  'designer',
  'engine',
  'person',
  'club',
  'marina',
  'company',
  'region',
];

export function isKnownNodeType(type: string): type is NodeType {
  return (KNOWN_NODE_TYPES as string[]).includes(type);
}
