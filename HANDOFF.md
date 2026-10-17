# HANDOFF — 2026-10-17 (late) session snapshot — ROUTE TO PROD COMPLETE EXCEPT FIREBASE DEPLOY

> **Authoritative for resume.** Supersedes every block below. On resume: read this block, then
> `state/session.json` -> bundle `state/sessions/20260703T215207Z-c2ca4ce7/session.json` (active_task null,
> `blockers` names the deploy auth problem).

## Where things stand (branch main = origin/main = 7f4dd63, everything pushed)
- **CLOSED today with green review + wargaming + delegated UAT (all PASS) + PLANTILLA-ENTREGA bodies:**
  TASK-030 facet panel (df19586 503b1de 8a74258 dd69598), TASK-034 Home landing (5756a9f 7ad0a30 b36aced),
  TASK-031 query builder facets (ab2d762 2b4beac ab863ea a53bea1 11add65), TASK-032 global search
  (3d14fe1 0acd802 e967e9b). Earlier: TASK-027, TASK-029 closed. Debts: TASK-028 (geo), TASK-033 (facets),
  LOW residuals listed in each ticket's close-out comment.
- App suite 22 files / 172 tests green; typecheck + build clean; Lighthouse accessibility 100 on /, /query,
  /browse/marina. `app/dist` built from HEAD (204 kB JS, 31 kB CSS). Knowledge graph has task/decision edges.
- **Human decisions today:** loop until done + ignore the 35% context guard; UAT of all four tickets delegated
  to the orchestrator; TASK-034 CU8/AC4 amended to <=5 tests; TASK-031 CU7 narrowed (Open in browse only when
  expressible in /browse); TASK-032 result groups ranked by relevance (name/geo above facet labels).
- **ONLY PENDING STEP: Firebase Hosting deploy.** `npx firebase deploy --only hosting --config ../firebase.json`
  (from app/) fails with "Failed to get Firebase project boat-site-e66fb": the CLI on this machine is logged in
  as rmatovelle84@gmail.com, which has no access to that project (projects:list shows 4 unrelated projects).
  Non-interactive `firebase login --reauth` only prints a URL + code flow. The human must run
  `! cd app && npx firebase login --reauth` interactively (prefix `!` in the prompt) with the owning account,
  or grant rmatovelle84@gmail.com Editor on boat-site-e66fb. Then: deploy, verify live /, /browse/marina,
  /query and the header search, then pause/end the session bundle.

## Process notes earned this session (keep)
- Wargaming challenger (general-purpose, 8 rounds, real code in scratch vitest) + fresh reviewer per hand-off
  caught: a cubic re-join in the facet URL parser (WG30-H2, introduced by the H1 fix), render crash on malformed
  meta.geo, 3 search-grammar MEDIUMs, Chrome's native Escape-clears-search-input (invisible to jsdom; only the
  browser UAT caught it). Keep doing browser UAT with puppeteer-core (scratchpad/uat/*.mjs has the launch recipe;
  Chrome at C:\Program Files\Google\Chrome\Application\chrome.exe).
- Parallel developers in the shared tree with pathspec-limited commits worked (no sweeps) because the file
  surfaces were disjoint; worktree isolation is unusable until `.claude/settings.json` carries
  `worktree.baseRef=head` (the file is plugin-rewritten; never commit it).
- close_task guards: body needs the PLANTILLA-ENTREGA numbered blocks, block 3 must name `CUn` + a path word,
  `[FINDING-HIGH: id]` needs `[FINDING-RESOLVED: id]`; `uat` comment: no preamble, every step `Verdict: PASS`,
  `Overall result: PASS`, >= AC-count steps, "verified by Orchestrator at the human's request" when delegated.
- Ports 5173/5174 busy; dev server on 5180 (was still running at snapshot time). Ingest tests need singleFork.

---

# HANDOFF — 2026-10-17 session snapshot (context-window pause before /clear)

> **Authoritative for resume.** Supersedes the 2026-10-16 block below. On resume: read this block, then
> `state/session.json` -> bundle `state/sessions/20260703T215207Z-c2ca4ce7/session.json` (active_task TASK-030,
> next_action is current), then `tasks/TASK-030.json` and `tasks/TASK-034.json`.

## Where things stand (all on branch main; origin/main is at d212a7c, later commits are LOCAL)
- **TASK-027 CLOSED** (geo hierarchy country>subdivision>city, attrs.geo, meta.geo). **TASK-029 CLOSED** (per-type
  attrs.facets + meta.facets; 3 fix rounds; closed via auditable exception only because one DEGRADED marker was too long).
  Graph 4,789 nodes / 4,199 edges; ingest suite 41 files / 1060 tests (single-fork mode only); app 150 tests; score 7.73.
- **Human decisions (2026-10-16/17):** UI English only; proposal bands; geography for all types first; route to prod =
  TASK-030 + TASK-031 + TASK-032 then ONE Firebase deploy; push authorized (done at d212a7c); **Home must be a landing page
  that explains the site; Explore is the clickable browsing hub** (TASK-034 rescoped, 8 use cases approved).
- **IN FLIGHT when context was cut (subagents will NOT survive /clear — their chat results are lost unless already on the ticket):**
  1. **TASK-030** (facet panel + navigable geography, requires_uat) — status in_review. Developer commits df19586, 503b1de
     (150 app tests green, verified by orchestrator). A fresh-context **reviewer** and a **wargaming challenger** were running;
     the REVIEWER verdict (code APPROVE, 0 HIGH, 4 LOW) IS recorded on the ticket; the WARGAMING result IS recorded too: 1 HIGH (WG30-H1: EntityView crumb writes raw city "Anping, Tainan" into
     the query while the facet codec splits on "," -> wrong rows) + 1 MEDIUM (boolean switch OR-appends). A FIX ROUND was
     dispatched to the TASK-030 developer (commit expected: `fix(TASK-030): shared crumb codec for comma values, boolean
     switch replaces group, lowercase ISO, review lows`). On resume: if that commit exists, spawn a fresh reviewer on it and
     replay the challenger probes (scratchpad wargame-030/probes.spec.ts + vitest.config.ts) before UAT; if it does not exist,
     re-spawn the developer with the fix-round text from the ticket [WARGAMING] comment; then [FINDING-RESOLVED: WG30-H1] (scratchpad
     wargame-030 may hold partial probes). Then HUMAN UAT on http://localhost:5180 using CU1-CU12 (ticket comment), record
     as author uat with per-step `Verdict: PASS` lines + `Overall result: PASS`, then close_task with PLANTILLA-ENTREGA body
     (block 3 must name cases as CUn and paths camino principal/alternativo/fallo).
  2. **TASK-034** (Home landing page; requires_uat) — status in_review. Developer DONE: commits 5756a9f + 7ad0a30 (hand-off on
     the ticket; 157 app tests, Lighthouse a11y 100). On resume: spawn fresh reviewer on `git diff c21bf12..7ad0a30` (note
     5756a9f predates c21bf12 in history: review `git diff 3787865..7ad0a30 -- app/` excluding 8a74258 files) + a challenger,
     then HUMAN UAT with CU1-CU8 (ticket comment), then close.
  2b. **TASK-030 fix round LANDED as 8a74258** (shared crumb codec for comma values, boolean switch replaces group, lowercase
     ISO, review lows). Developer hand-off message not yet received at snapshot time — read `git show 8a74258 --stat`, run
     `cd app && npm test`, then fresh reviewer on `git diff 503b1de..8a74258 -- app/` (skip TASK-034 files), replay
     wargame-030 probes, mark [FINDING-RESOLVED: WG30-H1], HUMAN UAT CU1-CU12, close.
- **Deploy when 030/031/032/034 are closed:** `cd app && npm run build && npx firebase deploy --only hosting --config ../firebase.json`, then `git push origin main`.

## Process notes earned this session
- close_task guards: closing body needs the 4 numbered PLANTILLA-ENTREGA blocks; block 3 must contain a case id like
  `CU3` AND a path word (camino/alternativo/fallo); every `[FINDING-HIGH: id]` needs `[FINDING-RESOLVED: id]` or a
  `[FINDING-DEGRADED: id — reason]` whose whole marker is under 500 chars with no `]` inside.
- Wargaming challenger = general-purpose agent, 8 fixed rounds, real code on throwaway sqlite dbs / scratch vitest, no repo
  writes; it found 2 HIGH on TASK-027 and 2 HIGH on TASK-029 that the reviewer missed. Keep doing it.
- Never-guess facet rules now in facetVocabulary.js / facets.js header comments; filters must read attrs.geo, never attrs.country.
- Ports 5173/5174 busy; dev server on 5180. .claude/settings.json is rewritten by the plugin hook each start — never commit it.

---

# HANDOFF — 2026-10-16 session snapshot (context-window pause before /clear)

> **Authoritative for resume.** Everything below this block supersedes the older 2026-07-11
> snapshot kept further down. On resume: read this section first, then `state/session.json`
> per CLAUDE.md RESUME-FIRST (the session bundle there predates this work and is idle/stale).

## What was done this session (all uncommitted, working tree only)
1. **Repo set up on this machine** (D:\boat-data, Windows). Node 22.19. `ingest/` and `app/`
   deps installed. Ports 5173/5174 are taken by an unrelated "Martial Photo" Vite project, so
   the dev server runs on **http://localhost:5180/** (`cd app && npx vite --port 5180 --strictPort`).
   Ingest tests only pass with `npx vitest run --pool=forks --poolOptions.forks.singleFork`
   (default parallel pool crashes "Worker exited unexpectedly" on this box; threads pool hangs).
2. **Hook fix**: `.claude/settings.json` statusLine/Stop/SessionStart commands pointed at
   `C:\Users\RafaelMatovelle\...`; rewritten to `$HOME/.claude/plugins/cache/hivemind-marketplace/hivemind/0.23.0/context-monitor/*.mjs`. Verified all three scripts exit 0.
3. **Dave Kess email batch ingested** (23 emails from davidadamkess@gmail.com to srparca@gmail.com,
   fetched via the Gmail connector). Written as `knowledge/100_*.md` … `114_*.md` (15 files, each
   with source date/subject header): salvage operators (100), vintage taxonomy (101), Florida
   Atlantic marina master list (102, 259 rows), South Florida dry stacks + slip rates (103), Europe
   dry stacks (104), offshore racing 2026 (105), marina categories/haul-out layer (106), Venice gondola
   dataset (107), Italy data architecture (108), Florida data architecture (109), corridor schema (110),
   site structure + monetization (111), marina data sources (112), MarineTraffic (113), rescue boats seed (114).
   Fixes applied during ingest: renamed prose headings that minted junk marina nodes (106, 112);
   company addresses normalized to "City, Florida" (100); "Harbour Village Marina Ponce Inlet" and
   "Safe Harbor Rybovich Riviera Beach" disambiguated (102) to avoid false merges.
4. **Clean ingest run** (`npm run ingest:clean`): nodes 4,278 → **4,656**, edges 3,107 → 3,401;
   marina 930 → 1,206, company 796 → 819, region 858 → 937. `ingest/data/graph.json` regenerated and
   synced to `app/public/data/graph.json`; app built; app tests 142/142 pass.
5. **Pinned baselines updated** in `ingest/tests/realCorpusExport.spec.js` (marina 1206, region 937 ×3,
   with dated comments). Full ingest suite: 39 files / 1,031 tests pass (single-fork mode).
6. **Filter/category proposal written**: `research/category-taxonomy-proposal.md` (Spanish). Diagnoses
   free-text attrs + flat regions, proposes `attrs.facets` controlled vocabulary per type, a
   country→subdivision→city hierarchy, facet panel UI, and a 7-step implementation plan.

## Open items / next actions
- User asked (in Spanish): "necesito que los filtros mejoren … organizar la data para crear las categorías".
  Proposal delivered; **awaiting 3 decisions** from the user (section 7 of the proposal): UI language,
  LOA/year bands, start with geography-for-all vs marinas-only. Then implement steps 1–7 of the plan.
- Nothing committed yet. Working tree: modified `.claude/settings.json`, `ingest/data/graph.json`,
  `ingest/tests/realCorpusExport.spec.js`, two lockfiles; untracked `knowledge/100–114_*.md`,
  `research/category-taxonomy-proposal.md`, stray `state/sessions/20260703T215207Z-c2ca4ce7/subagent-log.jsonl`.
  Suggested commits: `docs(knowledge): add Dave Kess Oct-2026 email batch (files 100–114)` +
  `chore(ingest): regenerate graph.json, update pinned baselines` + `fix(hooks): portable plugin paths`.
- Knowledge files 108–112 and 114 produce no graph nodes (strategy/architecture prose) — expected.
- Pre-existing junk regions noted but NOT touched: "north of town", "New River", "Palm Beach)" (from file 16).

---

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
