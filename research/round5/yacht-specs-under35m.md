# Yacht spec completion — under-35m LOA band + 70m+ stragglers (Round 6, Lane S)

Source: `ingest/data/graph.json` (599 `yacht` nodes). Band = `attrs.loa.meters < 35` OR
`attrs.loa.meters >= 70`, restricted to nodes **without** an existing `attrs.gt` (i.e. not
already resolved by the prior top-95 / `93_Yacht_Spec_Completion.md` pass).

Note on the extraction command in the brief: `attrs.loa` in the actual graph is a nested
object (`{ meters, raw }`), not a bare number, so the literal `n.attrs.loa<35` comparison in
the brief's one-liner would silently misbehave (JS would coerce the object to `NaN`, matching
nothing on the `<35` side and everything via `>=70` since `NaN>=70` is `false` too — i.e. it
would return zero rows as written). The filter below was applied against `attrs.loa.meters`
directly, read from the file.

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Blohm+Voss | 2008 | 119.0 | 18.87 | 5.15 | 5959 | 23 | 4250 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Owner Andrey Melnichenko; design Philippe Starck / Martin Francis. Graph previously had only LOA/year/former-name ("Topaz"); GT/beam/draft/speed/range added this round from BOAT International / SuperYachtFan. Do not confuse with the separate *sailing* yacht "A" (same owner, IMO 1012141) also in some source docs. |
| Alexander | Lübecker Flender-Werke | 1965 | 121.8 | 16.9 | 5.8 | 5933 | 18 | 4722 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Ex-Stavros Niarchos family yacht (delivered 1966), later Latsis family, now reported owned by the Saudi royal family. Corpus's separate "Atlantis II" (115.8m, 1981, Hellenic) is a different, later Niarchos-linked vessel — not a duplicate. |
| Batello (ex-Amevi, ex-Aalto) | Oceanco | 2007 | 80.0 | 14.2 | 3.9 | 2500 | 20 | N/A | N/A (unverified) | N/A (unverified) | N/A (unverified) | Corpus carries this hull as **two separate nodes** — `yacht:amevi` and `yacht:batello` — for what is the same real Oceanco Y701 vessel under successive names (Aalto → Amevi → Batello, current). Consolidated here under the current name; see Suspect entries. |
| Hasna (now Lunasea) | Feadship | 2017 | 73.0 | 11.9 | 3.45 | N/A (unverified) | N/A | N/A | N/A (unverified) | Lloyd's Register | N/A (unverified) | Delivered to first owner John Symond (2017); sold 2020 to Yahn Bernier and renamed *Lunasea*. Corpus entry retains the original name. |
| IJE | Benetti | 2019 | 108.0 | 15.5 | 4.4 | 3367 | N/A | N/A | N/A (unverified) | N/A (unverified) | N/A (unverified) | Benetti's flagship "gigayacht" (FB275) at delivery. |
| Lady Moura | Blohm+Voss | 1990 | 104.85 | 18.5 | 5.4 | 6539 | 20 | 8000 | Nassau | N/A (unverified) | 1002380 | Graph already had draft/flag/IMO; GT/beam/speed/range confirmed and added this round. One of the first true "megayachts." |
| Lionheart | Benetti | 2016 | 90.0 | 14.4 | 4.5 | 2990 | 18 | N/A | N/A (unverified) | Lloyd's Register | 1012323 | Part of Larry Green's fleet per corpus notes. |
| O'Pari | Golden Yachts | 2020 | 95.0 | 13.8 | 3.6 | 2743 | 18 | 8600 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Golden Yachts charter-fleet flagship; interior/exterior by Studio Vafiadis. |
| Project X | Golden Yachts | 2022 | 87.6 | 14.8 | 4.4 | 2974 | 18.2 | 5500 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Exteriors by Ken Freivokh, interiors by Massari Design. |
| Corroboree | Lloyds Ships | 1988 (refit) | 33.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Classic Great Barrier Reef charter vessel, ~$5M per corpus. Beam/draft/GT/speed not independently corroborated this round — too thin a public record for this specific charter boat to source with confidence; kept because year+value+distinguishing feature make it a real, specific vessel rather than a generic fragment. |
| Iron Blonde | Numarine | 2012 | 30.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Explorer-style, South Pacific charter, ~$8M per corpus. Likely Numarine's 26XP/30XP explorer line by size, but exact model not confirmed — left unverified rather than guessed. |
| Nomad | Oceanfast | 2003 | 30.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Fast motor yacht, South Pacific, ~$10M per corpus. Distinct from the same-corpus "Nomad (ex-Aussie Rules)" 69.5m entry — see Suspect entries for that name collision. |

## Suspect entries

Model-number-as-LOA errors (name contains a feet-based model designator that has been
recorded as if it were a metre LOA — implausible for the vessel type/name):

- **Sunseeker Manhattan 65** — recorded LOA 65m. The Manhattan 65 is a ~65-**foot** (≈19.7m)
  flybridge model; 65m would make it one of the largest yachts afloat, which is not the case.
- **Navetta 68** — recorded LOA 68m. Absolute's Navetta 68 is a ~68-**foot** (≈20.7m) motor
  yacht.
- **Pardo 50** — recorded LOA 50m. The Pardo 50 is a ~50-**foot** (≈15.5m) day cruiser/walkaround.
- **Arcadia Sherpa 60** — recorded LOA 60m. Arcadia Yachts' Sherpa line is well under 30m
  overall; "60" is almost certainly a feet/model designator, not metres.
- **ISA 120** — recorded LOA 120m. ISA's "120" line is a ~120-**foot** (≈36.6m) motor yacht.
- **Majesty 120** — recorded LOA 120m. Gulf Craft's Majesty 120 is a ~120-**foot** (≈36.5m)
  motor yacht, not a 120m superyacht.
- **Admiral 72 (Giorgio Armani)** — recorded LOA 72m. Admiral/Overmarine's Armani-collaboration
  models are sized in feet (72 ft ≈ 22m); a 72m Armani-branded yacht is not corroborated by any
  coverage of the Armani/Admiral partnership.
- **"Loewe" (builder id `sportiva-55`)** — recorded LOA 55m under a builder field that is
  literally the string "sportiva-55," itself a model-number artifact folded into the LOA/builder
  fields rather than resolved to a real builder.
- **Rivale 56** — recorded LOA 56m; no 56m yacht of this name is documented anywhere searched.
  Likely another feet-denominated model number.

Already-flagged / carried-forward suspects:

- **MOSAIQUE** (recorded 164m) — carries an existing `data_quality: "unverified — no matching
  real vessel found (2026-07 research pass)"` flag from a prior pass. Falls in the 70m+
  straggler band (no `gt`); still unresolved. Not included in the main table.
- **MYSTERE** and **EIV** — both already carry `conflicts.loa` notes from `research/round4/
  person-enrichment.md` documenting prior feet/meters correction (109m→33.29m and
  160m→48.8m respectively). Both now have `gt` populated, so they were correctly excluded
  from this pass's candidate list — flagged here only as evidence the same LOA-unit bug this
  report finds elsewhere has precedent and a known fix pattern.

Non-yacht artifacts (aggregated corpus commentary ingested as if they were vessel records —
should be pruned from the graph, not treated as yachts):

- `(Continuing with aggregated mid-size & emerging yachts from Riviera listings...)`
- `(Aggregated mid-to-large from Riviera pools: e.g., various Benetti 60-80m customs...)`
- `(Ranks 64-100)`
- `Various 110-112m`
- `Bold (repeat avoid, but variant)`

Duplicate real-vessel splits (same physical yacht recorded as two or more distinct nodes,
sometimes with conflicting builder attribution):

- **Amevi** / **Batello** — same Oceanco 80m hull (ex-Aalto), see main table.
- **Al Mirqab** — three nodes: one fully resolved (`gt: 9518`, builder `Kusch Yachts`), one thin
  duplicate attributing the builder to `Peters Schiffbau` (133m, no other data), and no
  reconciliation between the two builder claims.
- **H3** — one fully resolved node (`gt: 3521`, builder Oceanco) plus a thin `h3-various`
  duplicate with `loa: "70+"` and builder `various`.

## Sources

- [Motor Yacht A — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/motor-yacht-a--73827)
- [MOTOR YACHT A — SuperYachtFan](https://www.superyachtfan.com/yacht/a/)
- [119.0m Motor Yacht A — Superyachts.com](https://www.superyachts.com/fleet/a-specification-2061/)
- [A (motor yacht) — Wikipedia](https://en.wikipedia.org/wiki/A_(motor_yacht))
- [Lady Moura — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/lady-moura--73819)
- [Lady Moura — SuperYachtTimes](https://www.superyachttimes.com/yachts/lady-moura/overview)
- [Lady Moura — ShipSpotting (IMO 1002380)](https://www.shipspotting.com/photos/1936700)
- [Lionheart — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/lionheart--37705)
- [Lionheart — SuperYachtTimes](https://www.superyachttimes.com/yachts/lionheart-90m/overview)
- [IJE — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/i-j-e--96069)
- [IJE — Yacht Harbour](https://yachtharbour.com/yacht/ije-6850)
- [O'Pari — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/o-pari--95929)
- [O'Pari — SuperYachtTimes](https://www.superyachttimes.com/yachts/o-pari/overview)
- [Project X — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/project-x--60295)
- [Project X — Yacht Harbour](https://yachtharbour.com/yacht/project-x-7313)
- [M/Y Hasna — The Billionaires Club](https://yacht.the-billionaires-club.com/property/m-y-hasna-73m-private-yacht-by-feadship/)
- [Hasna — Yacht Harbour](https://yachtharbour.com/yacht/hasna-3747)
- [Lunasea (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Lunasea_(yacht))
- [Aalto/Amevi/Batello — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/aalto--55437)
- [Amevi — CharterWorld](https://www.charterworld.com/index.html?sub=yacht-charter&charter=amevi-1939)
- [Alexander — YachtBuyer](https://www.yachtbuyer.com/en/fleet/alexander-399-lubecker-flender-werke)
- [Alexander (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Alexander_(yacht))
- [Alexander — BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/alexander--46985)

## Coverage notes

- **Band size.** `ingest/data/graph.json` has 599 `yacht` nodes. Roughly 90 already carry an
  `attrs.gt` value (resolved by the prior top-95 / `93_Yacht_Spec_Completion.md` pass). The
  remainder — candidates for this pass — was reviewed by reading the full node range
  (`ingest/data/graph.json` lines ~54671–74160) directly, since `attrs.loa` is a nested
  `{meters, raw}` object rather than a flat number and the one-liner in the brief needed
  adapting (see header note above).
- **Why the table is short.** The overwhelming majority of nodes in-band are single-attribute
  fragments sourced from `41_Comprehensive_Monaco_Yacht_Charter_Guide.md` and
  `42_Monaco_Yacht_Show_Key_Players_Charters.md` — a name, an LOA, and a guessed `builderId`,
  with `year`/`value`/`features` all `null`. Many names repeat 3-11 times as separate nodes for
  the same charter listing scraped from different source docs (e.g. "Ad Astra" ×4, "Alvia" ×2
  with conflicting LOAs, "Come Together" ×3, "Kensho"/"Kenshō" ×3). None of these carry enough
  distinguishing detail (no year, no value, no owner, no distinctive feature) to identify a
  specific real vessel with confidence, so per the brief's "skip-and-flag liberally" guidance
  they were left out of the table rather than padded with guessed specs. This is consistent
  with how the corpus's own `93_Yacht_Spec_Completion.md` pass behaved — it only resolved GT for
  yachts that had enough of a paper trail to verify.
- **What was verified this round.** The 9 large (70m+) stragglers in the main table were
  cross-checked against BOAT International's Superyacht Directory, SuperYachtTimes, Yacht
  Harbour, YachtBuyer, and (for Alexander) Wikipedia. All 9 previously lacked `gt` in the graph;
  8 of 9 now have a verified or well-corroborated GT figure. Flag/class/IMO remain unverified
  for several of the smaller-profile yachts (Batello, IJE, O'Pari, Project X) — none of the
  sources surfaced these fields; marked "N/A (unverified)" rather than guessed.
  Under-35m coverage is thinner: only 3 of the many sub-35m fragments (Corroboree, Iron Blonde,
  Nomad) had enough corpus detail (year + value + a specific feature) to be worth including, and
  even those could not be corroborated with beam/draft/GT from public sources in this pass.
  Skipped generic sub-35m entries include (non-exhaustive): 4Life, A4A, Alaskan Story, Arsana,
  Atalante, BABAC, Bear Paw, Bellini, Benik, Best of Me, Big Data, Blackwood, Centurion,
  Champagne & Caviar, Charade, Crazy Love, Dauntless, Discovery, Fleur, Glacier Bear, Golden
  Eagle, Grey Wolf II, Greyb, Haze 2, Heavenly, Kayana, L'Octant, Laila, Largo, Life Time,
  Liquidity, Luciano, Martita, Meme, Miredo, Mirka, Mr. K, Oceana, Voyager, Wallygator,
  wallywhy200 — all single-attribute charter fragments with no distinguishing detail.
- **What was not fully re-verified.** Given the scale (essentially the whole non-top-95 corpus
  falls into one of the two bands), this is a representative sample of the most identifiable
  entries, not an exhaustive resolution of all ~500 remaining nodes. A follow-up pass could work
  through the Monaco-charter-guide fragments builder-by-builder (e.g. all Feadship-attributed
  entries together) to squeeze out a few more confident identifications, and/or dedupe the
  repeated-name nodes at the ingestion stage before further manual research is spent on them.
- **Suggested ingestion fix.** The feet/meters conflation bug found in MYSTERE and EIV (and
  newly here in Manhattan 65, Navetta 68, Pardo 50, Sherpa 60, ISA 120, Majesty 120, Admiral 72,
  Rivale 56) looks systemic to the model-number-style yacht names in the two Monaco charter-guide
  source docs. Worth a targeted ingestion-side regex check for `raw` values matching
  `<name> <number>` where the LOA equals that trailing number and the builder is a known
  production yacht line — most of these are feet, not metres.
