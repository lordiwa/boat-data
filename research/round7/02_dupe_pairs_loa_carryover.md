# Round 7, Lane B — Duplicate-Pair Grounding, LOA Confirmations, Uncarried Research Rows

Date: 2026-07-11
Ticket: TASK-025 (Round 7, Lane B)
Researcher: researcher subagent
Scope: sub-task 1 (six suspected duplicate pairs/equivalences), sub-task 2
(five model-number-derived LOA estimates), sub-task 3 (locate — not
re-research — uncarried research/ spec rows per TASK-024 review residual 4).

Project law observed throughout: **ungrounded merges stay split.** No MERGE
verdict below is issued without a citation that names the specific real
vessel/company and its defining attribute (builder, year, or LOA).

KB lookup note: this project's `knowledge/` tree is the ingestion corpus
(82 Grok-exported research documents), not a lessons-learned KB with
`knowledge/entries/*.md` + `knowledge/graph/graph.json` as described in the
researcher's standing instructions — no such directory exists in this repo
(verified via `Glob`). The mandatory KB-lookup step therefore produced no
candidates; `kb_hits: []`. Proceeded directly to graph inspection + web
research per the task's own instructions.

---

## Sub-task 1 — Duplicate-pair grounding

### a) yacht:samsara vs yacht:samsara-oceanco — **MERGE**

Both nodes: name "Samsara", LOA 88m, year "2015 (renamed)", value $150M,
identical "Circular swimming pool, cinema, beach club... previously
Infinity/Cloud 9" feature text. `yacht:samsara` resolves to
`builder:benetti`; `yacht:samsara-oceanco` resolves to `builder:oceanco`.

Grounding: Samsara is a single, well-documented 88.5m Oceanco hull (Y710),
delivered 2015 as *Infinity*, sold and renamed *Cloud 9* (2022), sold again
and renamed *Samsara* in 2023 (reported buyer J.K. Rowling). Design by Espen
Øino / Sinot / David Kleinberg. **Builder is Oceanco, not Benetti** — the
`yacht:samsara` node's builder attribution is factually wrong.

**Verdict: MERGE. Survivor = `yacht:samsara-oceanco`** (correct builder
attribution: Oceanco; richer data: `guests: 12` populated, two provenance
docs vs one, matches the real vessel). Authoritative attrs to carry onto the
survivor: `builder = Oceanco`, `loa = 88.5m`, `year = 2015`,
`value = $150M`. Discard `yacht:samsara`'s Benetti builder edge as an
ingestion/resolution error, not a competing fact.

Sources: [Samsara yacht | 88m Oceanco — SuperYacht Times](https://www.superyachttimes.com/yachts/samsara), [SAMSARA Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/samsara/), [Samsara yacht (Oceanco, 89m, 2015) — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/samsara--58351)

### b) yacht:moka vs yacht:moka-overmarine — **MERGE**

Both nodes: name "Moka", LOA 42.2m, same single provenance file
(`41_Comprehensive_Monaco_Yacht_Charter_Guide.md`). `yacht:moka` has
`cabins: 5`; `yacht:moka-overmarine` has all secondary fields null (a
strictly thinner duplicate of the same source-file entry).

Grounding: there are genuinely **two different real yachts named "Moka"** —
a 42.2m expedition yacht (10 guests / 5 cabins, refit 2021) and an
unrelated 49.9m Mangusta/Overmarine Group open yacht (ex *Sharq*, 2011,
currently for sale). The graph's two nodes both carry **42.2m**, which
matches only the smaller vessel — and that smaller 42.2m Moka's builder is
**Sanlorenzo, not Overmarine**. So the two graph nodes are duplicates of
the *same* real 42.2m Sanlorenzo-built Moka; the "Overmarine"/"Overmarine
Group" builder attribution on **both** nodes is wrong (a mix-up with the
unrelated 49.9m Mangusta Moka).

**Verdict: MERGE. Survivor = `yacht:moka`** (has `cabins: 5`, the richer of
the two identical-source duplicates). Authoritative correction to apply on
merge: `builder = Sanlorenzo` (not Overmarine/Overmarine Group), `loa =
42.2m`, `cabins = 5`, `guests = 10`.

Sources: [MOKA Yacht Details — Fraser Yachts](https://www.fraseryachts.com/en/yacht-for-charter/moka/) (Sanlorenzo, 42.2m), [Moka yacht (Overmarine Group, 49.9m, 2011) — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/moka--57621) (the *other*, unrelated Moka)

### c) yacht:that-s-amore vs yacht:that-s-amore-grandi-yatcilik — **MERGE**

Both nodes: name "That's Amore", LOA 42.9m, same single provenance file
(`41_Comprehensive_Monaco_Yacht_Charter_Guide.md`). `yacht:that-s-amore`
has `cabins: 6` and resolves to `builder:grandi-yatcilik-mimarlik` (an
actual builder node in the graph); `yacht:that-s-amore-grandi-yatcilik` has
all secondary fields null and resolves to `builder:grandi-yatcilik` — **an
orphan id with no corresponding builder node anywhere in the graph**
(verified via `Grep`; only `builder:grandi-yatcilik-mimarlik` exists).

Grounding: the 42.9m "That's Amore" gulet, built 2023 by **Grandi Yatcilik
Mimarlik** (Bodrum, Turkey), 12 guests in 6 cabins, 9.25m beam — matches
`yacht:that-s-amore` exactly on LOA, cabin count and builder.

**Verdict: MERGE. Survivor = `yacht:that-s-amore`** (correct, resolvable
builder id; matches real spec on cabins too). The duplicate's
`builder:grandi-yatcilik` reference should be dropped as an
entity-resolution normalization artifact of the same source row, not a
second real shipyard.

Source: [THAT'S AMORE Yacht Charter Price — YachtCharterFleet](https://www.yachtcharterfleet.com/luxury-charter-yacht-59942/that-s-amore.htm) (Grandi Yatcilik Mimarlik, 42.9m, 2023, 12 guests/6 cabins)

### d) yacht:sophia vs yacht:sophia-feadship — **STAY-SPLIT** (and a fabrication flag)

`yacht:sophia`: LOA `108` (raw `"108/354"`), no builder, no year, single
provenance (`28_Superyachts_Definition_Features_Innovations.md`).
`yacht:sophia-feadship`: LOA 97m, builder Feadship, year 2017, three
provenance docs.

These are **not the same vessel** and grounding for the 97m Feadship Sophia
is solid: she is the 96.55m/97m Feadship delivered 2017 as *Faith*, later
renamed *Sophia*, owner Michael Latifi. This is a real, independently
verifiable vessel, distinct from anything at 108m.

The 108m figure traces to `knowledge/28`'s table row "Sophia | 108/354 |
Benetti/2022 | ... Sister to IJE" — i.e., the source doc claims Sophia is a
Benetti 108m sister ship to *IJE* and *Mar*. This claim does **not** check
out: Benetti's actual 100m+ "Giga Season" trio (2019–2020) was **IJE
(108m), LANA (107m) and LUMINOSITY (107m)** — not "Mar" and "Sophia." No
independent source (SuperYachtTimes, Boat International, YachtCharterFleet,
Benetti's own site) corroborates a Benetti-built 108m yacht named "Sophia."
This looks like a hallucination/confabulation in the source corpus (these
are Grok-exported documents per project history), not a real distinct
vessel.

**Verdict: STAY-SPLIT** — per project law, do not merge an ungrounded node
into a grounded one. But flag `yacht:sophia` (108m/Benetti claim) itself as
**likely fabricated/ungrounded data** for a future `data_quality` pass —
it is not simply a feet/metres artifact of the 97m Feadship Sophia (108m ≠
97m under any unit conversion), it is an unrelated, seemingly invented
entry riding on the real IJE/LANA/LUMINOSITY story.

Sources: [Sophia yacht (Feadship, 96.55m, 2017) — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/sophia--87021), [SOPHIA Yacht • Michael Latifi — SuperYachtFan](https://www.superyachtfan.com/yacht/sophia/), [Benetti ready to launch 108m motor yacht FB275 — SuperYacht Times](https://www.superyachttimes.com/yacht-news/benetti-yacht-fb275) (confirms the real Giga-Season trio: IJE/LANA/LUMINOSITY, no "Sophia" or "Mar")

### e) yacht:dream-olympic vs yacht:dream-olympic-yacht — **MERGE**

Both nodes: name "Dream", LOA 107m. `yacht:dream-olympic` resolves to
`builder:olympic` (single provenance:
`42_Monaco_Yacht_Show_Key_Players_Charters.md`); `yacht:dream-olympic-yacht`
resolves to `builder:olympic-yacht` (single provenance:
`41_Comprehensive_Monaco_Yacht_Charter_Guide.md`). **Neither
`builder:olympic` nor `builder:olympic-yacht` exists as an actual builder
node anywhere in the graph** — both are orphan/dangling ids (verified via
`Grep`).

Grounding: "Dream" is a well-documented 106.5m/107m converted mega yacht
(ex-*Poseidonos*, a 1997 ferry/passenger ship converted into a superyacht),
credited to **Olympic Yacht Services**, Lavrio, Greece — up to 36 guests,
multiple pools, helipad.

Critically, the graph **already has a correctly-resolved third "Dream"
node**, `yacht:dream` (LOA 107m, `raw: "107/351"`, guests 36, crew 40, two
provenance docs, `builderId: builder:olympic-yacht-services` — a real
builder node, with a live `built_by` edge in the edges array, and
provenance tag `"graph-cleanup-merge"` indicating a prior partial cleanup
already folded some duplicate into it).

**Verdict: MERGE. Both `yacht:dream-olympic` and `yacht:dream-olympic-yacht`
should merge into the existing canonical `yacht:dream`** (not into each
other) — it already carries the correct builder edge
(`builder:olympic-yacht-services`) and the richest attribute set (guests
36, crew 40). This is the strongest-grounded merge in this batch: two
orphan builder-id references collapsing onto a node that already has the
real, edge-backed builder relationship.

Sources: [DREAM Yacht — 107m (350ft) Olympic Yacht Services 1997 — YachtBuyer](https://www.yachtbuyer.com/en/fleet/dream-349-olympic-yacht-services), [DREAM yacht for charter (Haliç Tersaneleri, 106.5m, 1997) — Boat International](https://www.boatinternational.com/charter/luxury-yachts-for-charter/dream-olympic-yacht-services-2018), [DREAM Yacht for Charter — Northrop & Johnson](https://www.northropandjohnson.com/yachts-for-charter/dream-349-olympic-yacht-services)

### f) builder:olympic-yacht-services vs marina:olympic-marine-lavrion — **STAY-SPLIT**

Graph check (`Grep` on "olympic", case-insensitive, over
`ingest/data/graph.json`): only two Olympic-named nodes exist —
`builder:olympic-yacht-services` (type `builder`, provenance
`"graph-cleanup-merge"`, no other attrs) and
`marina:olympic-marine-lavrion` (type `marina`, 680 berths, "Fuel, repairs,
crane, Wi-Fi, shops", provenance `35_Comprehensive_Greece_Yachting_Data_Report.md`).
No separate `builder:olympic-marine` node exists. `yacht:dream`'s
`built_by` edge points at `builder:olympic-yacht-services`, not at the
marina node.

Grounding: **Olympic Marine S.A.** is a marina/boatyard complex in Lavrio,
Attica (680 berths, 3 travelifts up to 200t, founded 1969, present-day site
`olympicmarine.gr`). **Olympic Yacht Shipyard (OYS)**, present-day site
`oys.gr`, is a distinct-looking present-day company at a specific address
("77th km. Athinon-Souniou Avenue, 19500 Lavrio") offering yacht
construction/conversion/refit — the entity publicly credited with the
*Dream* mega-yacht conversion. One secondary source states Olympic Marine
was itself "founded in Lavrio under the initial name of Olympic Yachts,"
hinting at shared historical lineage, but this is not strong enough
grounding to assert current-day corporate identity between the marina
company and the shipyard/refit company, and their present-day web presences
are separate.

**Verdict: STAY-SPLIT.** They are different node *types* (builder/refit
yard vs marina/berthing facility) representing related-but-distinct roles
in the same Lavrio waterfront cluster; insufficient grounding to assert
they are the identical legal entity today. No merge action taken.

Sources: [Olympic Marine — official site](https://www.olympicmarine.gr/gr/en/home/), [Olympic Yacht Shipyard (OYS) — official site](https://www.oys.gr/), [Lavrio Olympic Marine — CruisersWiki](https://www.cruiserswiki.org/wiki/Lavrio_Olympic_Marine)

---

## Sub-task 2 — LOA estimate confirmation

| Node | Stored | Verdict | Confirmed LOA | Source |
|---|---|---|---|---|
| `yacht:rivale-56` (Riva Rivale 56) | ~17.3m | **CONFIRMED** | **17.27 m** (56'8") | [Riva 56' Rivale — official Riva model page](https://www.riva-yacht.com/en-us/Model/p/2-174-281-PUB-EXT/n/Riva-56'-Rivale); spec-table figure (56'8" LOA) cross-checked via [YachtBuyer Riva 56 Rivale](https://www.yachtbuyer.com/en-us/riva/new/56-ft-rivale) |
| `yacht:arcadia-sherpa-60` (Arcadia Sherpa 60) | 18.28m | **CONFIRMED — but the stored figure is the wrong spec field** | **18.67 m** (true Overall Length; 18.28m is Arcadia's own "Hull Length" figure, a different, shorter measurement) | [Sherpa 60 Technical Data — Arcadia Yachts official](https://www.arcadiayachts.it/en/yachts/sherpa-technical-data-en/) ("Overall Length 18,67 m / 61'03''", "Hull Length 18.28 m / 60'00''") |
| `yacht:sunseeker-manhattan-65` (Sunseeker Manhattan 65) | 21.06m | **CONFIRMED (close)** | **21.08 m** (69'2", official spec-table figure) | [Sunseeker Manhattan 65 — YachtBuyer spec table](https://www.yachtbuyer.com/en-us/sunseeker/new/manhattan-65) ("Length overall 69' 2"") |
| `yacht:navetta-68` (Absolute Yachts' Navetta 68 — **not** Custom Line; graph resolves this node to `builder:custom`, which is itself a likely mis-attribution — see note below) | 20.52m | **CONFIRMED (near-exact)** | **20.53 m** (67'4") | [Navetta 68 — Absolute Yachts official model page](https://www.absoluteyachts.com/en/yacht/navetta-68/) ("Length Overall (LOA) 20.53 m / 67' 4"") |
| `yacht:yamas` (Yamas, Ferretti 670) | ~20.2m | **CONFIRMED** | **20.24 m** | [Ferretti Yachts 670 — official Ferretti Yachts model page](https://www.ferretti-yachts.com/en-us/Flybridge/Model/p/1-338-577-PUB-EXT/n/Ferretti-Yachts-670) ("LOA 20.24 m") |

**Navetta 68 builder note (out of scope for this LOA sub-task, flagged for
a future pass):** the graph resolves `yacht:navetta-68` to `builder:custom`,
but the LOA that matches to the centimetre (20.52/20.53m) belongs to
**Absolute Yachts'** Navetta 68 model specifically — Custom Line's own
"Navetta" series is named directly in metres (Navetta 30, 33, 37, 42…), not
"68," so a Custom Line match is implausible. Not corrected here; noted for
whoever owns the builder-attribution cleanup.

**Arcadia Sherpa 60 note:** the confirmed number materially *differs* from
the stored estimate (18.67m vs 18.28m) because Arcadia publishes two
distinct length figures on the same spec sheet (Overall Length vs Hull
Length) and the graph appears to have picked up the shorter one. This is a
correction, not just a confirmation — flagging for whoever applies the
`YACHT_QUALITY_CORRECTIONS`-style fix.

---

## Sub-task 3 — Uncarried research/ rows (located, not re-researched)

Per TASK-024's review residual (4): *"Lady Beth + some 55-70m band specs
live only in research/, never carried to a knowledge doc."*

Cross-checked `research/round5/yacht-specs-55-70m.md` (the 55-70m band
research file, 80 populated rows / 101 candidate nodes) against
`knowledge/97_Yacht_Spec_Completion_Round6.md`'s own "55-70m band" section
(lines 117–186), which explicitly states it curates
`research/round5/yacht-specs-55-70m.md`.

**Finding: knowledge/97 already carries essentially the entire 55-70m band
table** — every real-hull row present in the research file's table (Nomad,
Saluzi, Vassa, Ragnar, Wayfinder, Argus, Sycara V, Amor a Vida, Loon,
Vertigo, Calex, Okto, Alchemy, Z, Triumph, Joia The Crown Jewel, Artisan,
Eternity, Wedge Too, Zazou, Resilience, Magna Grecia, Lioness V, SuRi,
Soundwave, Lucky Lady, Event, Sea Owl, Simena, Roma, Sealion, Mary-Jean II,
Saramour, Rock.It, Sarastar, After You, Bella Vita, Katina, Alfa G, Katana,
Formosa, Andreas L, St David, Vision, ENTOURAGE, MEMORIES, Stella Mi, Come
Together, O'Madeleine, Scott Free, Maximus, Idol, Capri I, Pink Shadow,
Twizzle, Elis et Mar, The Wellesley, Zenji, Aelia, Geco, Moskito, Reliance,
Solemates, Loewe, Sportiva 55, Revelry) has a matching row in
knowledge/97's table. The research file's duplicate-node rows (Nomad ex-
Aussie Rules, Argus/Argus, Amor a Vida x2, Loon x2, RoMa, After You x3, St
David x2, Andrea L, Come Together x2, Pink Shadow x2, Loewe x2, Alchemia)
are *intentionally* excluded from knowledge/97 per its own stated policy
("only ONE row per real hull... other node(s) are grounded merge targets
for graphCleanup.js") — this is deliberate de-duplication, not an
uncarried gap.

**Genuine uncarried item found: "Lady Beth" — and only Lady Beth.**

- Graph has two "Lady Beth" nodes: `yacht:lady-beth` (`loa: 55` raw `"55"`,
  `builder:custom`, guests 12, cabins 6, crew null) and
  `yacht:lady-beth-lurssen` (`loa: 55` raw `"55"`, `builder:lurssen`, guests
  12, cabins 6, crew 12). Both currently carry only the rounded
  `knowledge/42` charter-guide figures — no year, beam, draft, or GT.
- `research/round5/yacht-specs-55-70m.md` (lines 168–171) and
  `knowledge/97_Yacht_Spec_Completion_Round6.md` (lines 90–93) **both**
  contain the identical prose note: *"the well-documented 54.86m 'Lady
  Beth' is a Newcastle Marine hull (populated above, under node
  `lady-beth`); no Lürssen 'Lady Beth' was found."*
- That claim is **inaccurate on inspection**: there is no table row
  anywhere in `research/round5/yacht-specs-55-70m.md`'s 55-70m table (nor
  anywhere else in the `research/` tree — confirmed via a whole-tree grep
  for "Lady Beth", "Newcastle Marine," and "54.86"/"54.9") that actually
  carries a Lady Beth spec row. The 54.86m/Newcastle Marine figures exist
  **only as a parenthetical claim in prose**, never as structured data, in
  either the research file or knowledge/97. Consequently `yacht:lady-beth`
  was never actually enriched — its on-disk attrs confirm this (still
  `loa: 55` rounded, `builder:custom`, no year/beam/draft/GT).

| Yacht | Research file location | Values sitting there | Ever reached knowledge/? | Ever reached the graph? |
|---|---|---|---|---|
| Lady Beth (node `yacht:lady-beth`, base) | `research/round5/yacht-specs-55-70m.md`, lines 168–171 (prose only, no table row) | LOA 54.86m; builder "Newcastle Marine" (no year/beam/draft/GT given even in the prose) | Yes, but also only as prose — `knowledge/97_Yacht_Spec_Completion_Round6.md`, lines 90–93, same claim, same absence of a table row | **No** — `yacht:lady-beth` on disk still shows unenriched `loa: 55` (rounded) / `builder:custom` |
| Lady Beth (node `yacht:lady-beth-lurssen`, duplicate) | Same lines, explicitly flagged "Left unresolved" (no Lürssen Lady Beth found publicly) | None — intentionally left unresolved | N/A (correctly not carried; no grounding to carry) | N/A |

**Count: 1 uncarried yacht found (Lady Beth)** — and even that one is
uncarried because the *underlying data itself was never captured as a
table row* in the research pass, not because a carry-forward step was
skipped. Per this sub-task's instruction not to re-research, no new figures
are proposed here; flagging that "carry Lady Beth in" (per the TASK-024
residual) is blocked on an actual research pass finding real
beam/draft/GT/year data for the 54.86m Newcastle Marine hull, which does
not yet exist in any file in this repo.

**UPDATE (see addendum below): this block has now been cleared.** A
dedicated research pass for Lady Beth was run as a same-day addendum to
this file — see "Addendum: Lady Beth research pass (sub-task 3 unblock)".

No other 55-70m band yacht was found uncarried.

---

## kb_hits

`[]` — no `knowledge/entries/*.md` KB exists in this repository (verified
via `Glob`); the project's `knowledge/` directory is the raw ingestion
corpus, not the lessons-learned KB described in the researcher's standing
instructions.

## Open questions

- Pair (d): should `yacht:sophia` (108m) be given an explicit
  `data_quality`/fabrication flag (matching the `MOSAIQUE`/`Blue`/`RIO`
  precedent in `knowledge/93`'s curation notes) rather than sitting as a
  silent orphan fragment? Recommend routing this to whoever owns
  `graphCleanup.js`'s `QUALITY_FLAGS` map.
- Pair (f): if a future source ever documents Olympic Marine S.A. and
  Olympic Yacht Shipyard (OYS) as the same legal entity (e.g., a shared
  company registration number), this should flip to MERGE — flagging as a
  candidate for re-check, not resolving now.
- Sub-task 2: the Navetta 68 builder mis-attribution (`builder:custom`
  instead of Absolute Yachts) and the Arcadia Sherpa 60 field mix-up
  (Hull Length stored where Overall Length belongs) are both real data-
  quality issues surfaced as a byproduct of LOA confirmation — out of this
  sub-task's scope to fix, noted for the Orchestrator to route.
- Addendum: Lady Beth's IMO number could not be located via `WebSearch`
  snippets (searches tried are listed in the addendum below); a direct
  Equasis/VesselFinder/MarineTraffic lookup was not attempted (out of tool
  reach for this pass) and would be the next step if IMO is required.

---

## Addendum: Lady Beth research pass (sub-task 3 unblock)

Trigger: Orchestrator follow-up, same day (2026-07-11), requesting a
dedicated research pass on motor yacht "Lady Beth" (candidate identity:
~54.86m/180ft, Newcastle Marine) to unblock the "carry Lady Beth in" item
identified in sub-task 3 above. Same never-guess rules apply: only
cite-backed values below; every figure is sourced; discrepancies between
sources are recorded rather than silently resolved.

### Identity verification

Every source found for "Lady Beth" (motor yacht) — SuperYacht Times, Boat
International, YachtBuyer, YachtCharterFleet, Northrop & Johnson, IYC,
CharterWorld, Marine Project, Out of the Blue Yacht Charters — points to
the **same single vessel**: a 54.86m (180ft) motor yacht built by Newcastle
Marine (also referred to as "Newcastle Shipyard"), delivered 2011,
currently flagged Cayman Islands. No source surfaced a second, different
"Lady Beth" at any size or from any other builder — in particular, **no
evidence of a Lürssen-built "Lady Beth" was found anywhere**, which
corroborates (does not overturn) `research/round5/yacht-specs-55-70m.md`'s
existing "Left unresolved" treatment of the second graph node
(`yacht:lady-beth-lurssen`, `builder:lurssen`). The candidate identity
given by the Orchestrator (~54.86m, Newcastle Marine) is **confirmed
correct** and unambiguous.

### Confirmed specifications

| Field | Confirmed value | Notes |
|---|---|---|
| LOA | **54.86 m** (180ft) | Also rendered "54.9m" by one source (rounding); no conflict. |
| Beam | **10.36 m** | Agreed by both Boat International and YachtBuyer. |
| Draft | **3.05 m** | Agreed by both Boat International and YachtBuyer. |
| GT | **1,100** | Agreed by both Boat International and YachtBuyer. |
| Max speed | **15.5 kn (Boat International) / 16 kn (YachtBuyer) — sources vary** | Not silently resolved; both figures recorded per this project's own conflict-marker convention (`yachtSpecMapper.js`'s `splitConflictMarker`). |
| Cruising speed | **12.0 kn** | Agreed across sources. |
| Range | **4,500 nm @ 10 kn** | Agreed across sources. |
| Flag | **Cayman Islands** | Boat International, YachtBuyer. |
| IMO | **Not found this pass** — see "Searches tried" below. | Not fabricated; left blank per this project's own rule. |
| Year | **2011** | Delivery year, agreed across all sources. Refit noted 2020 (YachtBuyer only — single-source, not corroborated elsewhere). |
| Builder | **Newcastle Marine** (Rome, GA / USA-built; also styled "Newcastle Shipyard" in charter listings) | Lady Beth is reported as Newcastle Marine's flagship, the largest hull the yard had built at the time, and the first hull of a "Newcastle 5500 series." |
| Former names | **Harbour Island (launch name) → Sovereign → Loon → Lady Beth (current)** | Agreed by two independent sources (Boat International, YachtBuyer). |
| Naval architecture | Murray & Associates | Boat International, SuperYachtTimes (aggregated). |
| Interior design | Claudette Bonville / Bonville Associates | Boat International, SuperYachtTimes (aggregated). |
| Hull/superstructure | Steel hull, aluminium superstructure, teak deck | Boat International, YachtBuyer. |
| Guests / cabins | 12 guests in 6 cabins | Agreed across sources — matches the graph's existing `guests: 12, cabins: 6` on both Lady Beth nodes. |
| Crew | **13–17, sources vary** (17 per one aggregation, 13 per Boat International's "ex Loon/Sovereign/Harbour Island" page, 14 per YachtBuyer) | Not silently resolved; record as a range/conflict, not a single confirmed number. |

**Important disambiguation flag:** one of Lady Beth's former names is
**"Loon."** This is a *different, unrelated* vessel from the 67.5m Icon
Yachts "Loon" (2010) that already appears as its own real, current-day hull
in `research/round5/yacht-specs-55-70m.md`'s 55-70m band table and in
`knowledge/97`'s carried-forward table (sub-task 3 above). Do **not** treat
Lady Beth's rename history as touching the Icon Yachts Loon node — same
name, two unconnected vessels, different builders and sizes (54.86m
Newcastle Marine vs 67.5m Icon Yachts).

### Searches tried for IMO (none surfaced a number)

- `"Lady Beth" yacht IMO number Newcastle Marine 2011 vesselfinder`
  (WebSearch) — returned charter/spec listings, no IMO in any snippet.
- Direct `WebFetch` of SuperYachtTimes' Lady Beth page returned HTTP 403
  (blocked), so its (if any) IMO field could not be read this pass.
- No direct query against VesselFinder, MarineTraffic, or Equasis was
  possible with the tools available in this pass (WebSearch/WebFetch only,
  no direct AIS-registry API access) — recorded as **"no public IMO found
  this pass,"** not "does not exist." A follow-up pass with direct registry
  access is the recommended next step if the IMO is required for the graph.

### Recommended values to carry onto `yacht:lady-beth`

(Reported for the Orchestrator/developer to apply — this researcher does
not write to `ingest/` or `knowledge/`.) Onto the base node
`yacht:lady-beth` (the correctly-identified Newcastle Marine hull):
`loa.meters = 54.86`, `beam.meters = 10.36`, `draft.meters = 3.05`,
`gt = 1100`, `max_speed = "15.5–16 kn (sources vary)"`,
`cruise_speed = 12.0`, `range_nm = 4500`, `flag = "Cayman Islands"`,
`year.value = 2011`, `builder = "Newcastle Marine"`, `former_names =
["Harbour Island", "Sovereign", "Loon"]`. `yacht:lady-beth-lurssen` remains
unchanged/unresolved — this pass found no grounding for a Lürssen "Lady
Beth" to merge or spec.

### Sources

[Lady Beth yacht (Newcastle Marine, 54.86m, 2011) — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/lady-beth--58647), [Lady Beth yacht | 54.86m Newcastle Marine 2011 — SuperYacht Times](https://www.superyachttimes.com/yachts/lady-beth), [LADY BETH yacht for charter (Newcastle Marine, 54.86m, 2011) — Boat International](https://www.boatinternational.com/charter/luxury-yachts-for-charter/lady-beth-newcastle-marine-2011), [LADY BETH Yacht for Charter | 180' (54.86m) 2011 6 Cabins Newcastle — Northrop & Johnson](https://www.northropandjohnson.com/yachts-for-charter/lady-beth-180-newcastle), [LADY BETH Yacht - 55m (181ft) Newcastle 2011 — YachtBuyer](https://www.yachtbuyer.com/en/fleet/lady-beth-180-newcastle), [LADY BETH Yacht - 181ft Newcastle 2011 (ex "Sovereign") — YachtBuyer](https://www.yachtbuyer.com/en-us/fleet/sovereign-180-newcastle), [LADY BETH Yacht Charter Price - Newcastle Marine — YachtCharterFleet](https://www.yachtcharterfleet.com/luxury-charter-yacht-26341/lady-beth.htm), [LADY BETH Yacht for Charter — IYC](https://iyc.com/charter/lady-beth/)
