// app/src/utils/relAnchors.ts
//
// TASK-012: shared anchor-id naming for entity-page relationship sections.
// EntityView.vue's inverse/outgoing relationship groups and
// utils/quickActions.ts's "jump to this section" chips both need the exact
// same DOM id for a given (rel, srcType) pair — deriving both from these two
// functions means the two can never drift apart into a chip that points at
// an id nothing on the page has.
import type { EdgeRel, NodeType } from '@/types/graph';

/** Anchor id for an inverse relationship section, e.g. (built_by, yacht) -> 'rel-built_by-yacht'. */
export function inverseGroupAnchor(rel: EdgeRel, srcType: NodeType): string {
  return `rel-${rel}-${srcType}`;
}

/** Anchor id for an outgoing relationship section, e.g. built_by -> 'rel-out-built_by'. */
export function outgoingGroupAnchor(rel: EdgeRel): string {
  return `rel-out-${rel}`;
}
