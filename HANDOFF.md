# HANDOFF — DataYacht enrichment loop (2026-07-11)

> **[2026-09-25] SUPERSEDED — historical snapshot.** This file was written mid-TASK-024
> on 2026-07-11 and its "In-flight right now" section is stale (TASK-024 and TASK-025 have
> both since closed). The authoritative state is the session bundle at
> `state/sessions/20260703T215207Z-c2ca4ce7/session.json`. Kept for the score trajectory,
> loop process rules and key paths below, which remain accurate.

> Context-window snapshot before /clear. On resume: follow RESUME-FIRST in CLAUDE.md
> (read `state/session.json` → bundle `state/sessions/20260703T215207Z-c2ca4ce7/session.json`
> → `tasks/TASK-024.json`), then reconcile with **In-flight right now** below.

## Mission (human-authorized, standing)
Autonomous enrichment loop until data completeness ≥ **8.5/10** on the honest
**identifiable-only target metric**. Full authorization: research rounds, mapper changes,
ingest, commits — no re-asking. Commercial dry docks + submarine facilities in scope.
Business rule: data tier stays free; ONE ad only when data is #1. Never push (commits stay local).

## Score trajectory (all measured by `cd ingest && npm run score`)
4.40 → 5.79 (R1 shipyards) → 6.02 (R2 engines/parts) → 6.67 (R3 builders/designers)
→ 6.53* (R4 yachts/marinas; *stricter 14-attr yacht schema re-baseline) → 6.80 (R5 persons/clubs)
→ 6.88 all-nodes / 6.92 identifiable-v1 (R6). TASK-024 re-baselines to Rule B: expect ≈ **7.17**.

## Ticket ledger (all reviewed by fresh-context reviewer, BLOCK→fix→APPROVE where noted)
- TASK-016 shipyards/dry docks (236, 53 countries) — CLOSED (1 fix round: comma-tonnage bug)
- TASK-017 engines 59 / engine_model 37 / part 111 / size_class 4 — CLOSED (1 fix round: "V8"→power_hp=8)
- TASK-018 accessibility WCAG 2.1 AA — **todo, next after TASK-024**
- TASK-019 builder/designer enrichment + 18 merges + suspect cleanup — CLOSED (AC waiver: Olympic Yacht Services)
- TASK-020 yacht specs top-95 + 38 new marinas + renames — CLOSED
- TASK-021 persons/clubs + ownership corrections + EIV/MYSTERE unit fixes — CLOSED (post-review sheikh column fix)
- TASK-022 region canonicalization 900→857 — CLOSED (carry: Naples split → done in 023)
- TASK-023 R6: 114 yacht specs, 9 unit corrections, 18 hull merges, identifiability v1 + dual scoring, double-ingest bug fix — CLOSED
- TASK-024 identifiability Rule B re-baseline + 023 LOWs (DB9 merge, conflicts entries, Naples guard, Year column, '~' estimates audit) — **IN PROGRESS**

## In-flight right now
- TASK-024 review verdict was **BLOCK** (1 HIGH): committed graph.json was built from the developer's
  stale untracked local graph.db (186-node divergence vs clean rebuild; the 9 '~' estimate cells still
  confirmed in artifact; true target metric **7.22** not 7.23). Rule B code itself verified correct
  (0/580 divergence). conflicts.identity convention APPROVED by reviewer.
- **TASK-024 CLOSED** (round-2 APPROVE; honest target metric **7.22**; artifact-freshness CI guard live;
  Round 7 residuals recorded verbatim in the ticket's close-out comment).
- **TASK-018 CLOSED** (PASS; Lighthouse 100/100; 142 app tests; durable jsdom label-mismatch guard
  via canvas stub; statement page live at /accessibility). **NINE tickets closed, nine green reviews.**
- **NO agents running. Board is clear.** Next session's job — Round 7 scoping:
  build one integration ticket from TASK-024's close-out residuals (items 1-6) + backlog
  (oligarch yachts, famous clubs, edge-attr UI, Newport/byc/syc regions, Sophia pair, edge-attr
  freshness guard) and decide the final push to 8.5 on the 7.22 baseline.
- Round 7 residuals recorded by reviewer (in TASK-024 review output + will go in close-out comment):
  23 weakest-tier identifiable yachts research band; samsara pair; Moka/That's Amore pairs;
  Lady Beth + 55-70m band specs never carried from research to knowledge doc (!); 5 remaining
  feet/metres LOA corrections (Rivale 56, Sherpa 60, Manhattan 65, Navetta 68, Yamas).
- All 15 research lanes (rounds 1-6) complete in `research/round*/`.

## Current graph state (commit 8731c30, branch main, NOT pushed — 30+ local commits)
4,277 nodes / 2,607 edges. yacht 581 (546/35 identifiable/fragment under rule v1), shipyard 236,
marina ~930, company ~795, region 858, builder 160, club 360, person 87, engine 59,
engine_model 37, part 111, size_class 4, designer 60. Tests: 814 ingest + 124 app, typecheck clean.

## Loop process rules (earned — also in auto-memory datayacht-enrichment-loop.md)
1. Research → `research/roundN/` → curated `knowledge/NN_*.md` (83-97 used so far) → mapper → ingest → score → fresh reviewer → close. Never edit graph.json by hand; corrections go through YACHT_QUALITY_CORRECTIONS / merge maps in graphCleanup.js with per-entry provenance.
2. Numeric cells are THE recurring bug source (comma bug, "V8"→8, feet-as-meters ×15). Every mapper: comma-strip, letter-adjacency rejection, range locks, pinned exact-value tests.
3. Enrichment resolves by EXACT graph name; name+country when collision possible. Never mint from enrichment docs (except explicitly: 38 new marinas were sanctioned).
4. Never-guess: empty beats invented; ungrounded merges stay split; estimates don't become confirmed numbers.
5. Metric changes land as separate labeled re-baseline commits, never inside data rounds.
6. Researchers must grep-confirm entities exist in graph before spending web budget.
7. Developers get fresh contexts per ticket (long-lived agent stalled after 5 tickets).

## After TASK-024 closes
1. **TASK-018** accessibility (queued ticket exists).
2. Gap-to-8.5 assessment under Rule B (`npm run score` per-type table tells where).
3. Round 7 candidates (backlog, grounded in ticket comments): seized-oligarch yacht ingestion
   (Amadea, Tango, Phi, Lady Anastasia, Lena, Valerie, Royal Romance — grounded in knowledge/95),
   famous-clubs ingestion (NYYC, Royal Yacht Squadron, RORC — absent from graph),
   ownership_confidence edge-attr UI surface, Newport OR/RI + byc/syc region splits,
   artifact:true UI badge, Sophia 108/97 pair grounding, Olympic Marine≡Olympic Yacht Services,
   yachtMapper conflicts.features dedupe quirk.

## Key paths
- Score: `cd ingest && npm run score` → `ingest/reports/completeness.json`
- Corrections/merges: `ingest/src/mappers/graphCleanup.js`, `regionCanonicalization.js`, `identifiability.js`
- Pins + range locks: `ingest/tests/realCorpusExport.spec.js`
- Dev server note: portfolio project owns port 5173 (IPv4); run app via `npm run dev -- --port 5180 --host`
