# Beating Wikipedia: Dataset Gap Analysis for DataYacht (Research Lane I, TASK-017)

Baseline measured 2026-07-10: 3,357 nodes / 1,823 edges. yacht 605 (loa 94%, year 21%,
value 14%), marina 893 (berths 15%), company 527, region 642 (no attrs), club 368,
builder 186 (zero attrs), person 110, engine 16, designer 10. No shipyard/dry-dock type
yet (in flight, ~200 facilities). Corpus: 82 Grok-export docs in `knowledge/`.

## Wikipedia audit

Wikipedia/Wikidata's yacht coverage is real but narrow and shallow outside a short list
of trophy vessels:

- **`List of motor yachts by length`** is the closest thing Wikipedia has to a yacht
  database. It is a single table, hard-cut at ≥75 m LOA, with ~140-150 rows and exactly
  eight columns: rank, name, length, built year, owner, builder, photo, refs. No beam,
  draft, gross tonnage, speed, range, engines, naval architect, designer, refit history,
  price, or marina/homeport. Anything under 75 m (i.e. the vast majority of the
  serious yacht market, 24-75 m) simply does not exist as a row anywhere on Wikipedia.
- **Individual yacht articles** exist only for a few dozen of the most famous vessels
  (Azzam, Eclipse, Dilbar, A, Koru, Nord, Octopus/Musashi-class, royal/state yachts,
  historic sailing yachts). Article depth varies wildly and is prose-only — not
  structured, not queryable, and rarely cross-linked to a builder's own fleet list.
- **Builder articles** (Lürssen, Feadship, Oceanco, Heesen, Amels, Royal Huisman,
  Benetti, etc.) exist for maybe 20-30 top-tier yards, each with a partial "notable
  yachts" list, but no export-ready structured data (dry docks, max LOA, founded year,
  build slots, order book). Second- and third-tier builders (regional yards, historic
  builders, defunct yards) have thin or no coverage.
- **Wikidata** (`Q170173` yacht, `Q11446` ship) has generic ship properties (P176
  manufacturer, P127 owned by, length/beam/draft/tonnage properties, P289 vessel class)
  but population is sparse and inconsistent — most individual yacht items only carry
  name + instance-of + maybe length; the property schema exists, the data mostly
  doesn't.
- **Structurally weak/absent on Wikipedia entirely**: refit yards and dry docks,
  marinas (a handful of famous ones like Port Hercules get prose, not structured data),
  the service ecosystem (crew agencies, insurers, class societies, surveyors), charter
  rates, brokerage/sale price history, ownership chains through holding companies,
  AIS/real-time position, parts/engines/tenders inventories, incidents and seizures
  (beyond a few headline oligarch-yacht cases), and the new-build order book.
- **Net read**: Wikipedia is authoritative and current for "what is the 20th-longest
  yacht in the world and who built it," and essentially empty for everything an owner,
  broker, surveyor, or enthusiast actually needs day to day.

## Competitor scan

| Source | Strengths | Paywalled | Free gap we exploit |
|---|---|---|---|
| SuperYacht Times (iQ) | Largest industry DB (14,000+ yachts ≥24 m), 20+ yrs of new-build/refit/brokerage/ownership history, AIS map, custom alerts, exportable reports | Entire iQ database, AIS history, alerts, reports — free tier is news-only | Structured yacht-to-builder-to-marina-to-owner graph, free, with citations, for the long tail Wikipedia and SYT's free tier both ignore |
| BOAT International (BOATPro) | Live global order book (20+ yr archive), 5-yr AIS history, 8-yr sales/price trend analysis, live refit tracker, fleet stats for 24 m+, API add-on | Nearly everything — order book, AIS, refit tracker, sales data, API, app, alerts; only news/analysis teased free | Same category of data (order book, refit, specs) offered free and cross-linked into a browsable graph instead of a locked dashboard |
| YachtCharterFleet | 4,000+ charter yacht listings, charter rate ranges (all-inclusive vs APA/plus-expenses), amenity/toy search, destination guides, sample itineraries | Off-market yacht access, industry-connections intelligence tier | Free structured charter-rate + amenity data linked to the same yacht node as specs/builder/owner, not siloed in a separate charter site |
| Yatco (MLS) | 15,000+ boats/yachts for sale, ~2,000 charter yachts, central-exclusive MLS (no duplicate listings), broker-owned data, API/live-feed integration, ShowBook (boat-show inventory) | Full MLS feed/API access, BOSS CRM platform, regional-list depth | Free cross-linking of "for sale" state to the yacht's builder/engine/marina history — Yatco is a marketplace, not a knowledge graph |
| MarineTraffic | Largest terrestrial AIS network (300k+ vessels/day), ~2 yrs historical tracks, port calls, vessel photos | Live positions beyond basic delay, historical tracks, fleet alerts, API | We don't compete on live AIS (out of scope/cost-prohibitive); we can ingest *published* port-call and last-known-region facts as static, free, cited attributes |
| VesselFinder | Satellite AIS (open-ocean coverage), up to 3 yrs historical tracking, cheaper premium tier ($7/mo) | Live open-ocean positions, historical playback, alerts | Same as MarineTraffic — static, citation-backed last-known/homeport facts instead of a live feed |
| Equasis | Free, IMO/EU-backed registry: IMO number, flag, classification society, registered owner, ISM/ship manager, P&I info, inspection/deficiency history, 85,000+ ships from 50+ providers | Nothing meaningful — it's a free public-good registry (light registration wall only) | Not a competitor to out-flank, a **source to ingest**: flag state, class society, and IMO number are exactly the structured fields DataYacht is missing and Equasis gives away free |

## Ranked gap list

| Rank | Dataset/Idea | Why Wikipedia loses | Sourcing difficulty | Feeds type |
|---|---|---|---|---|
| 1 | Yacht spec completion: beam, draft, gross tonnage, top/cruise speed, range, fuel capacity | Wikipedia's motor-yacht table has 8 columns total and no specs beyond length/year; individual articles are prose, not structured | Medium — brokerage listings, builder spec sheets, superyacht fan wikis; needs normalization across units | enriches `yacht` |
| 2 | Builder attribute enrichment (founded year, HQ, country, fleet count, specialty/segment) | 186 of our builders have zero attributes; Wikipedia only has articles for ~20-30 top yards | Easy-medium — builder "About" pages, Wikipedia where it exists, trade press | enriches `builder` |
| 3 | Flag state + IMO number + classification society | Wikipedia never records this; it's the core of vessel identity and legal status | Easy-medium — **Equasis is free and built for this** | enriches `yacht` |
| 4 | Engine-to-yacht links (propulsion make/model/count/power per hull) | Only 16 engine nodes exist and are largely disconnected; Wikipedia has separate marine-propulsion articles with zero yacht linkage | Medium — spec sheets, brokerage listings, engine-maker press releases | new edges `yacht`↔`engine`, enriches `engine` |
| 5 | Refit history per yacht (yard, year, scope of work, before/after) | This is BOATPro/SYT's premium "live refit tracker" — Wikipedia has nothing, not even for trophy yachts | Medium-hard — trade press, yard press releases, some brokerage "refit in 20xx" notes | enriches `yacht`, links to `shipyard` (once modeled) |
| 6 | New-build order book (yacht under construction, builder, hull number, delivery year, status) | This is BOATPro's flagship paywalled product; Wikipedia has no forward-looking construction data at all | Medium — boat-show announcements, builder press releases, trade press (Boat International/SYT news is free to read even if the DB isn't) | new instances of `yacht` (status=building) + edges to `builder` |
| 7 | Charter/sale price history (asking price, sold price, weekly charter rate by season) | Wikipedia has zero pricing data of any kind; this is SYT/BOATPro/Yatco's core commercial product | Medium-hard — YachtCharterFleet publishes charter rate ranges free; sale prices are harder (often undisclosed) | enriches `yacht`, new attribute set `price_history` |
| 8 | Ownership chains (beneficial owner → holding company → flag registry) | Wikipedia only names an "owner" in prose for a handful of celebrity/oligarch yachts; no chain-of-title modeling | Hard — shell companies obscure this; corpus already has partial data (celebrity/oligarch docs 13, 15, 74, 76) to extend | new edges `yacht`↔`company`↔`person` |
| 9 | Incidents and accidents (sinkings, fires, groundings, collisions, insurance claims) | Wikipedia covers only headline disasters; no systematic incident log tied to specific hulls | Medium — corpus already has Florida shipwreck data (docs 01-02) to extend to modern incidents via news archives | new type `incident`, edges to `yacht` |
| 10 | Auctions and seizures (marshal sales, sanctions seizures, forced sales) | Wikipedia mentions a few high-profile oligarch seizures in prose only; no structured registry | Easy — corpus already has doc 74 (Seized Yachts of Russian Oligarchs) as a seed; extend via court/DOJ/EU sanctions filings | new attribute on `yacht` (legal_status), edges to `company`/`person` |
| 11 | Designer portfolios (naval architect + exterior + interior designer per yacht) | Only 10 designer nodes exist; Wikipedia rarely credits designers distinct from builders | Medium — builder press kits, design-house portfolios (Espen Øino, Winch Design, etc.) | enriches `designer`, new edges `yacht`↔`designer` |
| 12 | Marina depth, fuel dock, services, max LOA accommodated | 893 marina nodes, only 15% have berth counts, zero depth/fuel/services data; Wikipedia doesn't cover marinas as infrastructure at all | Medium — cruising guides, marina websites, harbor authority docs (corpus already has Miami/Florida docking docs 24-26, 55-58) | enriches `marina` |
| 13 | Yacht show calendar (Monaco, Fort Lauderdale, Palm Beach, Düsseldorf, Cannes) with exhibitor/yacht links | Wikipedia has thin standalone articles per show, no linkage to which yachts/builders exhibited which year | Easy — show press kits and corpus already has Monaco Yacht Show docs (41, 42, 61) | new type `event`, edges to `yacht`/`builder`/`company` |
| 14 | Dry-dock/haul-out schedule and yard capacity (max LOA, dock dimensions, lift type) | In flight per baseline (~200 facilities); Wikipedia has no shipyard infrastructure data at all | Medium — yard websites, trade press (corpus round1/builder-yards.md already seeded this) | new type `shipyard` |
| 15 | Crew agencies and crew certification pipeline | Wikipedia has generic articles on RYA/STCW certifications, zero linkage to yachts, agencies, or placement | Medium — corpus already has certification docs (07, 08); crew agency directories are public | new type `crew_agency`, edges to `yacht`/`person` |
| 16 | Toys and tender inventory (tender models, jet skis, submersibles, helicopters per yacht) | Wikipedia never itemizes onboard equipment; charter sites do this but only for their own charter fleet | Medium — brokerage listings, charter site amenity pages, superyacht fan sites | enriches `yacht` |
| 17 | Club-to-yacht membership links | 368 club nodes exist with no yacht linkage; Wikipedia's yacht-club articles are prose history only | Medium — club fleet/member lists (often private), regional yacht club docs already in corpus (32-40, 49, 54, 60, 65) | new edges `club`↔`yacht`/`person` |
| 18 | Yacht insurance providers/underwriters | Wikipedia has no yacht-insurance data whatsoever, and no commercial competitor publishes this free either | Hard — insurers don't publish per-hull data; only aggregate market info is public | new type `insurer`, edges to `yacht` (low near-term priority) |
| 19 | AIS-derived last-known position / homeport (static, citation-backed, not live tracking) | Wikipedia has none; MarineTraffic/VesselFinder/BOATPro paywall live and historical AIS | Hard to do live (cost-prohibitive); easy-medium to capture published "last seen in X" facts from press | enriches `yacht` (non-real-time attribute only) |
| 20 | Region/geography enrichment (country, coordinates, cruising waters, season) for the 642 zero-attribute region nodes | Wikipedia's geography articles exist but aren't yacht-contextualized (no season/cruising-ground framing) | Easy — corpus already has extensive destination docs (27, 34-46, 71) purpose-built for this | enriches `region` |

## Scorecard

| Pillar | Wikipedia | DataYacht today | DataYacht at 8.5/10 |
|---|---|---|---|
| Completeness in niche (yacht-specific depth) | Deep for ~150 trophy yachts ≥75 m, near-zero below that cutoff | 605 yachts but only 94% have LOA and 14% have value; most other fields empty | 2,000+ yachts with 80%+ field completion on LOA/beam/draft/GT/year/builder/engine, matching or exceeding SYT's public reach |
| Structure/queryability | One flat 8-column table plus unstructured prose articles; no API | SQLite + JSON graph, typed nodes/edges, Vue explorer — already structured | Same graph model scaled up with the 20 new datasets above as first-class node/edge types |
| Freshness | Edited ad hoc, no systematic update cadence; order-book/refit data absent entirely | Static ingestion from a fixed 82-doc corpus, last measured 2026-07-10, no live refresh | Scheduled re-ingestion pipeline picking up new-build/refit/sale press on a defined cadence (weekly/monthly), citations dated |
| Cross-linking (entity-to-entity graph) | Minimal — yacht articles link to builder/owner articles but not to marinas, engines, or clubs | 1,823 edges across yacht/marina/company/region/club/builder/person/engine/designer — real but shallow (builder has zero attrs, engine has 16 nodes only) | Dense graph: every yacht linked to builder, designer, engine(s), marina/homeport, club, owner chain, and shipyard/refit history |
| Provenance (citations per fact) | Wikipedia citation quality varies; many yacht facts uncited or single-sourced | Corpus-derived, traceable to specific Grok-export docs, but not yet exposed per-field in the UI | Every enriched field carries a visible source citation in the explorer, matching or beating Wikipedia's inline-citation norm |
| Media (photos/diagrams) | Strong for trophy yachts (professional photos), weak/absent below the cutoff | Research doc 19 (High Quality Yacht Images) exists but not yet ingested into node records | Photo/diagram coverage for the majority of yacht and shipyard nodes, sourced and licensed |
| Coverage of the long tail (24-75 m yachts, regional builders, small marinas) | Essentially absent — the 75 m cutoff excludes most of the real market | Present in raw form in the corpus (regional yacht club/marina docs) but under-extracted (marina berths 15%, builder attrs 0%) | Long-tail yachts, builders, and marinas as complete as trophy-tier entries — this is the single biggest structural advantage over Wikipedia |
| Expert curation (domain judgment, not just facts) | General-purpose editors, no yachting-specific expertise required | Corpus already reflects targeted research (haul-out yards, brokerage trends, certifications) — a curatorial head start | Explicit ranked/curated views (e.g., "top haul-out yards," "notable refits by yard") layered on top of raw facts, something Wikipedia's NPOV norms structurally avoid |

## Sources

- [List of motor yachts by length — Wikipedia](https://en.wikipedia.org/wiki/List_of_motor_yachts_by_length)
- [Superyacht — Wikipedia](https://en.wikipedia.org/wiki/Superyacht)
- [Wikidata:WikiProject Ships/Properties](https://www.wikidata.org/wiki/Wikidata:WikiProject_Ships/Properties)
- [yacht — Wikidata (Q170173)](https://www.wikidata.org/wiki/Q170173)
- [BOATPro — Product Features](https://www.boatinternational.com/boat-pro/features)
- [BOATPro — Superyacht Market Data and Insight](https://www.boatinternational.com/boat-pro)
- [SuperYacht Times iQ — Home](https://sytiq.superyachttimes.com/)
- [SuperYacht Times iQ — About](https://sytiq.superyachttimes.com/about)
- [10 reasons why SYT iQ is essential — SuperYacht Times](https://www.superyachttimes.com/yacht-news/syt-market-data)
- [YachtCharterFleet — home](https://www.yachtcharterfleet.com/)
- [YachtCharterFleet — Yacht charter costs explained](https://www.yachtcharterfleet.com/advice/yacht-charter-costs-explained-2)
- [YachtCharterFleet — Search by amenity](https://www.yachtcharterfleet.com/charter/features)
- [YATCO — Professional Services](https://www.yatco.com/professional-services/)
- [YATCO — About Us](https://www.yatco.com/about-us/)
- [YATCO — Buy a Yacht (MLS)](https://www.yatco.com/buy-a-yacht/all-yachts-for-sale/condition-all/vesseltype-all)
- [MarineTraffic vs VesselFinder vs ShipFinder — Maritime Page](https://maritimepage.com/marinetraffic-vs-vesselfinder/)
- [VesselFinder — Subscription Plans](https://www.vesselfinder.com/get-premium)
- [What is Equasis Shipping Database? — BoatsGeek](https://boatsgeek.com/what-is-equasis-shipping-database/)
- [Equasis — Data Providers](https://www.equasis.org/EquasisWeb/public/About?fs=HomePage&P_ABOUT=Providers.html)

## Coverage notes

- **What I did not verify directly**: exact current subscription prices for SYT iQ and
  BOATPro (search results did not surface list pricing; both appear to be
  quote/tier-gated). If pricing matters for the monetization narrative, a follow-up
  fetch of `sytiq.superyachttimes.com/pricing` and a BOATPro sales-contact quote would
  be needed.
- **Local KB check**: this repo has no populated `knowledge/entries/` lessons-learned
  base yet (the `knowledge/` directory here is the 82-doc Grok-export yacht corpus, a
  different thing from the lessons-learned KB described in researcher process docs), so
  the mandatory KB lookup produced zero candidates — this is expected on a
  not-yet-seeded KB, not a process skip.
- **Corpus cross-check**: several of the ranked gaps (10, 12, 13, 14, 15, 17, 20) already
  have partial source material sitting unextracted in the existing 82-doc corpus
  (`knowledge/13_*`, `15_*`, `74_*`, `76_*` for ownership/seizures; `24-26`, `55-58` for
  marinas; `41-42`, `61` for Monaco Yacht Show; `07-08` for crew certifications; `32-40`,
  `49`, `54`, `60`, `65` for clubs; `27`, `34-46`, `71` for regions) — these are lower
  sourcing-effort than the ranking difficulty label implies for "new web research"
  because ingestion, not discovery, is the bottleneck.
- **Not independently confirmed**: Equasis's exact free-vs-registration-wall boundary
  (some fields may require account creation, not just IP-based free access) — treat as
  "free with a lightweight signup," not fully anonymous/open.
- **Scope not covered**: I did not investigate Grokipedia, Wikiwand, or other Wikipedia
  mirrors/forks as separate competitors since they re-serve Wikipedia's underlying data
  and inherit the same gaps documented above.
