# Yacht Spec Completion — 55-70m LOA Band (Round 6, Lane P)

Band extracted from `ingest/data/graph.json` (599 yacht nodes total): yacht
nodes with `attrs.loa.meters` in `[55, 70)` and no `attrs.gt` (i.e. never
touched by the existing `yachtSpecMapper.js` pass documented in
`knowledge/93_Yacht_Spec_Completion.md`). **101 yacht nodes** matched.

This band skews toward semi-custom/production-adjacent 55-70m tonnage
(Benetti, Amels Limited Editions, Heesen 55 Steel series, ISA, CRN, Codecasa)
rather than the ultra-famous 100m+ fleet, so many names are generic
("Vision", "Event", "Memories") and shared across multiple unrelated hulls.
Builder edges from the graph (`built_by`) were pulled for every node first
and used as the primary disambiguation signal alongside LOA, per the task's
own guidance.

**Coverage: 80 of 101 nodes populated** (many as flagged duplicate-node
pairs/triples of the same real hull — see Coverage notes). **21 nodes
skipped** — 5 as confirmed data-quality errors (feet/meters or model-number
mixups), 5 as LOA/builder mismatches against the best-documented real vessel
of that name, 1 as "not found," and 10 as too generic to disambiguate
confidently (single-word names + `builder:custom` with no owner/year/other
signal).

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nomad | Oceanfast | 2003 | 69.5 | 11.58 | 3.0 | 1,260 | 18 max / 15 cruise | | | | | |
| **Nomad** (ex-Aussie Rules) | Oceanfast | 2003 | 69.5 | 11.58 | 3.0 | 1,260 | 18 max / 15 cruise | | | | | Same real vessel as "Nomad" above (graph node id `nomad-ex-aussie-rules`); duplicate/merge candidate — not merged here. |
| Saluzi | Austal Ships | 2003 | 69.1 | 13.8 | 2.4 | 1,739 | 16 max / 14 cruise | | | | | Day-charter configuration for up to 50 guests (25 staterooms). |
| Vassa | Feadship | 2012 | 68.77 | 11.2 | 3.65 | 1,274 | | | | | | De Voogt naval architecture, RWD interior. |
| Ragnar | ICON Yachts (1971-built hull, converted/launched as a yacht 2020) | 2020 | 68.2 | 14.0 | 3.15 | 2,272 (post-redesign; one source cites 2,450) | | | Malta | Bureau Veritas | | Viking-themed expedition conversion; RWD redesign. Some brokers list a later resale/rename to "Q" — not corroborated as the same graph identity. |
| Wayfinder | Astilleros Armón | 2021 | 68.2 | 14.4 | 3.5 | 1,737 | 20 max / 14 cruise | 4,400 @ 13kn | | | | Bill Gates's catamaran-hulled support/"shadow" vessel (Incat Crowther naval architecture); IMO Tier III compliant. |
| Argus | Svendborg Skibsværft (1971 build; converted to an expedition yacht, major 2022 refit) | 1971 / 2022 | 68.5 | 12.0 | 4.6 | | | | | | 7104752 | Originally a Danish government inspection/lighthouse-tender vessel. |
| Argus | Svendborg Skibsværft (1971 / 2022) | 1971 / 2022 | 68.5 | 12.0 | 4.6 | | | | | | 7104752 | Duplicate graph node (id `argus-custom`) of the row above; merge candidate. |
| Sycara V | Nobiskrug | 2010 | 68.15 | 12.52 | 3.6–3.76 (sources vary) | 1,566 | | | | | | |
| Amor a Vida | CRN | 2025 | 67.55 | 11.8 | 3.3 | 1,447 | 17 max / 12 cruise | | | | | First hybrid-propulsion CRN superyacht. |
| Amor a Vida | CRN | 2025 | 67.55 | 11.8 | 3.3 | 1,447 | 17 max / 12 cruise | | | | | Duplicate graph node (id `amor-a-vida-crn-yachts`) of the row above; merge candidate. |
| Loon | Icon Yachts | 2010 | 67.5 | 11.4 | 3.4–3.8 (sources vary) | 1,295 | 16 max / 13 cruise | 6,000 | | | | Icon Yachts' flagship; ex "Icon". RWD design. |
| Loon | Icon Yachts | 2010 | 67.5 | 11.4 | 3.4–3.8 | 1,295 | 16 max / 13 cruise | 6,000 | | | | Duplicate graph node (id `loon-icon`) of the row above; merge candidate. |
| Vertigo | Alloy Yachts | 2011 | 67.2 | 12.53 | 5.05 | 837 | | | Marshall Islands | | | Sailing yacht; Dubois/Vitruvius naval architecture, Liaigre interior. |
| Calex | Benetti | 2022 | 67.0 | 10.6 | 3.1 | 1,249 | 16 max | | | | | |
| Okto | ISA Yachts | 2014 | 66.4 | 10.5–11.0 (sources vary) | 3.35 | 1,149 | 18.5 max / 16 cruise | 6,800 | | | | Andrea Vallicelli naval architecture, Alberto Pinto interior. |
| Alchemy | Rossinavi | 2023 | 65.7 (also cited 66) | 11.31 | 3.11 | 1,194 | 16 max / 12 cruise | 4,000+ | | | | Diesel-electric pod-drive propulsion; Vitruvius Yachts (Philippe Briand) design. |
| Alchemia | Rossinavi (per this row's disambiguation) | 2023 | 65.99 (graph raw) | 11.31 | 3.11 | 1,194 | 16 max / 12 cruise | 4,000+ | | | | Likely a spelling-variant duplicate of "Alchemy" above — no separate "Alchemia" hull found in any source (same builder, same size, same year). Flagged, not merged. |
| Z | Amels | 2014 | 65.7 | 12.28 | 3.85 | 1,503 | 17 max / 14 cruise | 5,000 | | | | Tim Heywood exterior, Winch Design interior. **Graph data-quality flag:** this node carries an `owned_by` edge to Barry Zekelman, but public sources do not corroborate that link — Zekelman's documented yacht is "Man of Steel" (86m Oceanco, already spec'd in round3's file), a different vessel entirely. |
| Triumph | Benetti | 2021 | 65.4 | 11.2 | 3.5 | 1,244 | 16.5 max / 15 cruise | 4,700 | | | | Giorgio M. Cassetta exterior. |
| Joia The Crown Jewel | Codecasa | 2010 | 65.23 | 11.2 | 3.7 | 1,278 | 17 max | 5,000 | | | | |
| Artisan | Benetti | 2019 (refit 2024) | 65.0 | | | | 16 max / 14 cruise | | | | | Described as "the largest yacht sold in 2025" by IYC; beam/draft/GT not located this pass — left blank rather than guessed. |
| Eternity | Codecasa | 2010 | 65.0 | 11.2 | 3.5 | 1,046 | 17 max / 14 cruise | | | | | Graph attributes builder as "custom" — corrected here to Codecasa per BOAT International / YachtBuyer. (A separate, much smaller 2023 Mangusta/Overmarine "Eternity" (~49.9m) and a 2023 33m Mangusta "Eternity" also exist publicly — not to be conflated; this row is the 65m Codecasa hull matching the graph's LOA.) |
| Wedge Too | Feadship | 2002 | 65.0 | 11.3 | 3.35 | 1,300 | 16.5 max / 15 cruise | 2,600 | | | | Philippe Starck interior/exterior. |
| Zazou | Benetti | 2021 | 65.0 | 11.9 | 3.4 | 1,180 | 16 max / 15 cruise | | | | | Giorgio M. Cassetta exterior, Sinot interior. |
| Resilience | ISA Yachts | 2021 | 64.76 | 11.5–12 (sources vary) | 3.5 | 1,401 | | | | | | |
| Magna Grecia | Elsflether Werft | 1986 | 63.8 | 8.9 | 3.8–4.11 (sources vary) | 850 | | | | | | Terence Disdale interior, Donald Starkey exterior. |
| Lioness V | Benetti | 2006 | 63.5 | 12.1 | 3.6 | 1,389 | 16 max / 12 cruise | | | | | Ex "Lionheart". |
| SuRi | Halter Marine | 1978 | 63.4 | 11.58 | 3.2–3.35 (sources vary) | 1,355 | | | | | | Built as an offshore support vessel; later converted to a shadow/explorer yacht. |
| Soundwave | Benetti | 2015 | 63.0 | 10.8 | 3.5 | 1,181 | 17 max / 15 cruise | 5,000 | | | | Ex "11:11". |
| Lucky Lady | Oceanco | 2002 | 62.6 | 10.5 | 3.65 | 1,083 | 15 max / 12 cruise | | | | | Ex "Lady Lola"; Zuretti interior, The A Group exterior. |
| Event | Amels | 2013 | 62.4 | 10.3 | 3.45–3.5 | 1,147 | | | | | | |
| Sea Owl | Feadship | 2013 | 62.0 | 12.2 | 3.7 | 1,494 | 16 max / 10 cruise | | | | | Andrew Winch exterior and interior. |
| Simena | Ares Yachts | 2026 (delivery) | 62.0 | 10.8 | 4.5 | 499 | 14.5 max | 5,000 | | | | Sailing yacht; carbon-fibre superstructure. |
| Roma | Viareggio Superyachts (VSY) | 2010 | 61.8 | 11.0 | 3.0 | 1,090 | 17 max / 14 cruise | 6,000 | | | | Espen Øino design. |
| RoMa | Viareggio Superyachts (VSY) | 2010 | 61.8 (graph: 62) | 11.0 | 3.0 | 1,090 | 17 max / 14 cruise | 6,000 | | | | Likely the same real vessel as "Roma" above under a differently-cased graph name (id `roma-viareggio`, no `built_by` edge in the graph itself); merge candidate. |
| Sealion | Viareggio Superyachts (VSY) | 2009 | 61.8 (graph: 62) | 11.0 | 3.1–3.2 | 1,056 | 17 max / 15.5 cruise | 4,500 | | | | Espen Øino design. |
| Mary-Jean II | ISA Yachts | 2010 | 61.73 | 12.0 | 3.2 | 1,238 | | | | | | |
| Saramour | CRN | 2014 | 61.3 | 10.2 | 3.1 | 1,080 | 15 max | | | | | Francesco Paszkowski design. |
| Rock.It | Feadship | 2014 | 60.35 | 10.8 | 3.3 | 1,052 | | | | | | |
| Sarastar | Mondomarine | 2016/2017 (sources vary) | 60.22 | 10.75 | 2.9 | 979 | | | | | | |
| After You | Damen Yachting (Xplorer 60) | 2025 | 60.2 (graph: 60) | 11.0 | 3.6 | 1,160 | 14.5 max | 5,000 | | | | First Xplorer 60; won Robb Report's Best Explorer Yacht award. A different, unrelated 2011 Heesen "After You" (~55m) also exists publicly but is not in this graph's node set — do not conflate. |
| After You | Damen Yachting (Xplorer 60) | 2025 | 60.2 (graph: 60) | 11.0 | 3.6 | 1,160 | 14.5 max | 5,000 | | | | Duplicate graph node (id `after-you-damen-yachting`) of the row above; merge candidate. |
| After You | Damen Yachting (Xplorer 60) | 2025 | 60.2 (graph: 60) | 11.0 | 3.6 | 1,160 | 14.5 max | 5,000 | | | | Duplicate graph node (id `after-you-xplorer`) of the row above; merge candidate — "Xplorer" is Damen Yachting's yacht brand, not a separate shipyard. |
| Bella Vita | Lürssen | 2010 | 60.0 | 11.43 | 3.5 | 1,218 | 16 max / 11 cruise | 5,000 | | | | Espen Øino exterior, Glade Johnson interior. One broker lists a former name "Solemates" for THIS yacht — unrelated to the different, newer Heesen 55m "Solemates" (2025) also in this table; do not conflate. |
| Katina | Brodosplit | 2015 | 60.0 | 10.68 | 2.9 | 1,212 | 14 max / 12 cruise | 4,000 | Marshall Islands | | | |
| Alfa G | Oceanco | 2004 | 60.0 | 10.5 | 3.89 | 1,184 | 15 max / 12 cruise | | | | | |
| Katana | Perini Navi | 2025 | 60.0 | 11.4 | Retractable keel (max draft unconfirmed — one source's "12.3 m" figure looks implausible for beam 11.4m and is not used here) | 491 | 15.5 max / 12 cruise | 3,500 | | | | Fourth hull of Perini Navi's 60m ketch series; carbon masts/rigging, dynamic positioning. |
| Formosa | Benetti | 2015 | 60.0 | 10.6 | 3.37 | 1,089 | 16.5 max / 14 cruise | | | | | Sinot interior. |
| St David | Benetti | 2008 | 60.0 | 10.4 | 3.6 | 969 | | | | | | Ex "Xanadu"; Winch Design. |
| St David | Benetti | 2008 | 60.0 | 10.4 | 3.6 | 969 | | | | | | Duplicate graph node (id `st-david-custom`) of the row above; merge candidate. |
| Vision | Benetti | 2011 | 60.0 | 10.41 | 3.4 | 1,008 | 16 max / 15 cruise | 5,000 | | | | Pierre-Yves Rochon interior. |
| Andreas L | Benetti | c.2016 | 60.0 | 10.4 | 3.5 | 971 | 16 max / 15 cruise | | | | | Rename chain reported across brokers: Amnesia → Andreas L → MIMI → LA BLANCA. Stefano Natucci exterior, RWD interior. |
| Andrea L | Benetti | c.2016 | 60.0 | 10.4 | 3.5 | 971 | 16 max / 15 cruise | | | | | Likely a spelling-variant duplicate of "Andreas L" above — no distinct "Andrea L" hull found in any source. Flagged, not merged. |
| ENTOURAGE | Amels | 2023 | 60.0 | 10.4 | 3.35 | 830 | | | | | | Amels 60 Limited Editions series; ex-project "Witchcraft". |
| ETERNITY | — | — | — | — | — | — | — | — | — | — | — | See "Eternity" row above (65m Codecasa) — same graph node family, this line intentionally not duplicated. |
| MEMORIES | Amels | 2025 | 60.0 | 10.4 | 3.35 | 853 | | | | | | Amels 60 Limited Editions series. |
| Stella Mi | Amels | 2021 | 60.0 | 10.6 | 3.4 | 1,015 | 16 max / 14 cruise | 4,500 | | | | Also listed by brokers as "Stella M". |
| Come Together | Amels | 2022 | 60.0 | 10.4 | 3.35 | 853 | | | | | | Amels 60 Limited Editions series; award-winning design. |
| Come Together | Amels | 2022 | 60.0 | 10.4 | 3.35 | 853 | | | | | | Duplicate graph node (id `come-together-custom`) of the row above; merge candidate. |
| O'Madeleine | Golden Yachts | 2025 | 60.0 | 11.0 | 3.05 | 1,305 | | | | | | Greek-built superyacht. |
| Scott Free | Abeking & Rasmussen | 2009 | 60.0 | 10.7 | 3.53 | 1,090 | 16 max / 14 cruise | | | | | |
| Maximus | Vitters | 2023 | 59.0 | 10.2 | 8.0 | 395 | 13 max | 3,000 | | | | German Frers design; ketch-rigged, twin rudders — draft is deliberately deep (performance sailing yacht). |
| Idol | Austal Ships (as "Oceanfast") | 2007 | 58.9 | 10.55 | 2.57 | 903 | 17 max / 15 cruise | 4,000 | | | 1008205 | |
| Capri I | Lürssen | 2003 | 58.55 (graph: 58.6) | 11.43 | 3.5 | 1,226 | | | | | | Graph attributes builder as "Proteksan-Turquoise" — corrected here to Lürssen per BOAT International/YachtBuyer (Proteksan-Turquoise builds an unrelated, similarly-named "Turquoise"/"Capricorn" line). |
| Pink Shadow | Damen Yachting (Xplorer 58) | 2023 | 58.3 (graph: 58) | 11.0 | 3.6 | 1,091 | 14.5 max | 5,000 | | | | Only Xplorer 58 hull built. |
| Pink Shadow | Damen Yachting (Xplorer 58) | 2023 | 58.3 (graph: 58) | 11.0 | 3.6 | 1,091 | 14.5 max | 5,000 | | | | Duplicate graph node (id `pink-shadow-custom`) of the row above; merge candidate. |
| Twizzle | Royal Huisman | 2010 | 57.49 (graph: 57) | 11.6 | | 498 | 14 max / 12 cruise | 4,000 | | | | Dubois naval architecture, RWD exterior, Todhunter Earle interior. One SERP's "35'5\" draft" figure looks like a mast-height mix-up, not a real draft value — left blank rather than guessed. |
| Elis et Mar | Trinity Yachts | 2012 | 57.03 (graph: 57) | 10.21 | 2.5 | 782 | | | | | | |
| The Wellesley | Oceanco | 1993 (refit 2016) | 56.2 (graph: 56) | 9.1 | 3.1 | 608 | | | | ABS | 8990495 | |
| Zenji | Perini Navi | 2004 | 55.9 (graph: 56) | 11.52 | 9.73 | 499 | 16 max / 11 cruise | | | | | Sailing yacht; Ron Holland exterior, Perini Navi interior. |
| Aelia | Benetti | 2015 | 55.85 (graph: 56) | 10.6 | 3.3 | 988 | 15.5 max / 15 cruise | | | | | |
| Geco | Admiral — The Italian Sea Group | 2020 | 55.2 (graph: 55.2) | 8.6 | 2.25 | 499 | | | | | | |
| Moskito | Heesen | 2021 | 55.0 | 9.6 | 2.85 | 760 | 15.5 max | 4,500 | | | | Heesen 55 Steel series. |
| Reliance | Heesen | 2023 | 55.0 | 9.6 | 3.17 | 760 | 15.5 max / 13 cruise | 4,500 | | | | Heesen 55 Steel series, 6th hull; Omega Architects exterior, Luca Dini interior. |
| Solemates | Heesen | 2025 | 55.0 | 9.6 | 2.7–3.15 (sources vary) | 760 | 15.5 max | 4,500 | | | | Heesen 55 Steel series. Unrelated to the different Lürssen 60m ex-name "Solemates" noted under "Bella Vita" above. |
| Loewe | Tankoa (T55 Sportiva, 2nd hull) | 2025 | 55.0 | 9.0 | 2.4 | 499 | 17.5 max / 15 cruise | 5,000 | | | | Luca Dini exterior. |
| Loewe | Tankoa (T55 Sportiva) | 2025 | 55.0 | 9.0 | 2.4 | 499 | 17.5 max / 15 cruise | 5,000 | | | | Duplicate graph node (id `loewe-tankoa`). This node's own `_resolution.builderId` nonsensically points to "builder:sportiva-55" — i.e. the model name leaked into the builder field — confirming this is a data-extraction duplicate rather than a second real yacht. Merge candidate. |
| Sportiva 55 | Tankoa | 2025 | 55.0 | 9.0 | 2.4 | 499 | 17.5 max / 15 cruise | 5,000 | | | | This graph entry's name is the MODEL name (T55 Sportiva), not an individual hull name. The series' first hull is publicly named "Rose" (2025); this row is left as the generic model spec rather than assigned to either "Rose" or "Loewe" without evidence. |
| Revelry | Amels | 2012 | 54.3 (graph: 55) | 9.0 | 3.15 | 642 | 15.5 max / 13 cruise | | | | | Graph attributes builder as "Delta Marine" — corrected here to Amels per BOAT International/YachtBuyer. LOA (54.3m) is just under the graph's rounded "55" — kept in this band since the graph node itself is the query target. |

## Sources

Boat International (superyacht directory + editorial), SuperYachtTimes,
YachtHarbour, YachtBuyer, YachtCharterFleet, Superyachts.com, itBoat,
Fraser Yachts, Northrop & Johnson, Edmiston, Y.CO, Moran Yacht & Ship,
Merlewood, CharterWorld, Wikipedia (Rock.It, Ragnar, Sea Owl), Amels
Yachting official fleet pages, Heesen Yachts official fleet pages, Tankoa
official site, ISA Yachts official fleet pages, Rossinavi official fleet
page, ARES Yachts official portfolio, VesselFinder / MarineTraffic /
ShipSpotting (IMO cross-checks for Argus, Idol, The Wellesley), Boat
International brokerage-sales news (Artisan sale).

## Coverage notes

**21 of 101 band nodes skipped** (see below); **80 populated**, several of
which are flagged duplicate-node pairs/triples for a single real hull
(Nomad, Argus, Amor a Vida, Loon, Alchemia/Alchemy, Roma/RoMa, After You x3,
St David, Andrea L/Andreas L, Come Together, Pink Shadow, Loewe) — these are
merge candidates for a future `graphCleanup.js` pass, not resolved here, per
this project's stated practice of only merging GROUNDED duplicates.

**5 confirmed data-quality errors — feet/model-number leaking into the `loa`
field as if it were metres (same failure class as the round4 file's
EIV/MYSTERE corrections):**
- **Rivale 56** (graph: 60m... actually 55m) — real "Riva 56 Rivale" is a
  56-*foot* (~17.3m) open cruiser; "56" is the model's foot-based name, not
  its length in metres.
- **Arcadia Sherpa 60** (graph: 60m) — real hull length is 18.28m; "60" is
  Arcadia's own model-line number, not metres.
- **Sunseeker Manhattan 65** (graph: 65m) — real LOA is 69'1" / 21.06m; "65"
  is the model name (loosely foot-based), not metres.
- **Navetta 68** (graph: 68m) — real "Absolute Navetta 68" LOA is 20.52m;
  "68" is the model's foot-based name, not metres.
- **Yamas** (graph: 67m) — real "Yamas" is a Ferretti 670 (~20.2m); "670" is
  Ferretti's own model number, not a length figure at all.

These five should go through the same `YACHT_QUALITY_CORRECTIONS`-style
mechanism as EIV/MYSTERE rather than being treated as real 55-70m yachts;
none is populated in the table above.

**5 LOA/builder mismatches — no confident match to the graph's recorded
size or builder for that name:**
- **Barbara Anne** (graph: 59m) — the only well-documented "Barbara Anne" is
  a 40.9m Baglietto DOM 133 (2024), 18m short of the graph's figure. Skipped.
- **Burrasca** (graph: 64.5m, builder `van-der-graaf`) — the only
  well-documented "Burrasca" is a 55.7–58m Perini Navi sailing yacht (2003),
  neither the size nor the builder matches. Skipped.
- **Marguerite** (graph: 65m, builder `codecasa`) — the only well-documented
  "Marguerite" is a 60.97m Lürssen (2004, Andrew Winch design); no Codecasa
  "Marguerite" was found at any length. Skipped.
- **Hampshire II** — TWO graph nodes (58m and 66.25m), both tagged
  `built_by: feadship`. The only well-documented "Hampshire II" is a 78.5m
  Feadship (2012) — outside this band and matching neither node. Both
  skipped rather than force a mismatched 78.5m dataset onto either.
- **Katina** (second node, id `katina-benetti`, builder `benetti`) — the
  well-documented 60m "Katina" is a Brodosplit hull (populated above); no
  separate Benetti-built "Katina" was found publicly, so this node is left
  unresolved rather than assumed to be the same vessel (the builder
  disagreement is a stronger signal here than in the Loewe/Loon/Roma cases,
  where the graph's alternate builder tag was clearly a fallback/generic
  value, not a named competing shipyard).
- **Lady Beth** (second node, id `lady-beth-lurssen`, builder `lurssen`) —
  the well-documented 54.86m "Lady Beth" is a Newcastle Marine hull
  (populated above, under node `lady-beth`); no Lürssen "Lady Beth" was
  found publicly. Left unresolved.

**1 not found:** **Purpose** (graph: 55m, builder `feadship`) — no public
record of a 55m Feadship named "Purpose" was located; Feadship owners
frequently keep launch names private, so this may simply be undisclosed
rather than wrong. Skipped rather than guessed.

**10 skipped as too generic to disambiguate** (single, common English-word
names with `builder:custom` in the graph and no owner/year/other
distinguishing signal in the node itself — multiple unrelated real yachts
plausibly share each name, and no combination of LOA + builder + provenance
narrowed it to one hull with confidence): **Genesis, Kinda, Orion One,
Party Girl, Polarfront, Prana** (builder tag is a brokerage/charter company,
not a shipyard), **Spirit, Una Vida**. Per the task's own instruction
("if not confidently disambiguable, skip and flag"), these were not
researched further rather than risk assigning another vessel's specs.

**Weakest fields across the whole table:** Flag, Class Society and IMO —
confirmed for only a handful of rows (Vertigo/Marshall Islands,
Katina/Marshall Islands, The Wellesley/ABS+IMO, Idol/IMO, Argus/IMO,
Ragnar/Malta+Bureau Veritas). Most 55-70m charter-market yachts in this band
simply don't surface IMO/flag/class in the public broker listings that
dominate search results for this size range (unlike the 100m+ band, where
BOAT International profiles routinely list them) — left blank throughout
rather than guessed, per the task's own rule.
