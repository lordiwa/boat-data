# Yacht Spec Completion — Round 6 (Long Tail)

Curated from the four `research/round5/` band files (`yacht-specs-55-70m.md`,
`yacht-specs-45-55m.md`, `yacht-specs-35-45m.md`, `yacht-specs-under35m.md`)
for TASK-023, via the same `yachtSpecMapper.js`/`isYachtSpecTable` mechanism
knowledge/93 uses. Closes the beam/draft/GT/max-speed/range/flag/class-
society/IMO gap for the graph's long-tail (55-70m, 45-55m, 35-45m) yachts
plus a handful of 70m+ "stragglers" and under-35m fragments the earlier
top-95 pass (knowledge/93) didn't reach.

Same discipline as knowledge/93: resolves onto EXISTING yacht nodes by
exact-then-normalized name only (never mints); a row with no matching
yacht node is counted as `unresolved` and reported, never created.

## Curation notes

**Duplicate-node clusters — only ONE row per real hull is included here**
(the other graph node(s) in each cluster are grounded, GROUNDED-only merge
targets for `graphCleanup.js`'s `YACHT_MERGE_MAP` — see that module's own
TASK-023 item 3 comment for the full per-cluster citation; this mapper
never merges nodes itself, so including a second identical row would just
be redundant, not additive): Nomad, Argus, Amor a Vida, Loon, Alchemia
(folds onto Alchemy), RoMa (folds onto Roma), After You (x3 nodes), St
David, Andrea L (folds onto Andreas L), Come Together (x3 nodes), Pink
Shadow (x3 nodes), Loewe. Where the merge's chosen canonical (`to`) node
doesn't happen to be the one this mapper's own LOA-tie-break would resolve
onto first (e.g. "Loewe" — both duplicate nodes share the exact name and
LOA, so the mapper's tie-break lands on the non-canonical `yacht:loewe`
node first), `graphCleanup.js`'s `mergeNode()` gap-fills the spec attrs
onto the true canonical node when the merge runs (always AFTER every
file's spec rows have been mapped — see `ingest.js`'s own hook-ordering
comment), so no data is lost either way.

**"Sportiva 55" is NOT part of the Loewe duplicate cluster** — it is a
separate, legitimately-existing graph node for Tankoa's T55 Sportiva MODEL
line itself (distinct from the individual "Loewe" hull), so it gets its
own spec row below rather than being folded into anything.

**former_names addition:** `yachtSpecMapper.js`'s `FORMER_NAMES_MAP` gains
one new entry this round — `batello: ['Amevi', 'Aalto']` — for the same
Oceanco Y701 80m hull's full rename chain (Aalto → Amevi → Batello,
current); "Amevi" is the old-name node `graphCleanup.js`'s `YACHT_MERGE_MAP`
merges away, same pattern as `mar`/`madsummer`/`kaos` in knowledge/93.

**Unit-bug corrections (model-number/feet leaked into the LOA column) are
handled entirely by `graphCleanup.js`'s `YACHT_QUALITY_CORRECTIONS`, NOT by
this file** — Pardo 50, Rivale 56, Arcadia Sherpa 60, Sunseeker Manhattan
65, Navetta 68, ISA 120, Majesty 120, Admiral 72 (Giorgio Armani), Yamas
never appear as spec rows below (see that module's own TASK-023 item 2
comment for the full per-yacht correction/blank-and-flag rationale).

**Same-name-different-hull conflicts — deliberately excluded, NOT applied
to a graph node whose LOA/builder contradicts the researched real vessel**
(per the ticket: recorded here as unresolved-conflict rather than guessed
onto a mismatched node):
- **AQA** (graph: 49m Inace) — the only public "AQA" is an unrelated 28.01m
  Export Yachts hull; no 49m Inace-built AQA found. Skipped.
- **Grace** (graph: 52.4m, Australian Yacht Builders) — two distinct public
  "Grace" yachts exist (58.5m AYB, 52.3m Amels), neither matching the
  graph's exact combination. Skipped.
- **Panam** (graph: 49m, CCN) — the only public "Panam" is a 40.2m
  Baglietto/CCN hull, 8.8m short of the graph's figure. Skipped.
- **Starburst IV** (graph: 47m, Bilgin) — only "Starburst III" (47.4m
  Bilgin) is documented; no "Starburst IV" found. Skipped.
- **Night Fury II** (graph: 49.9m, Columbus) — the only public record is a
  43.0m Columbus Atlantique 43, 6.9m short of the graph's figure. Skipped.
- **Little Perle** (graph: 50m) — the only public "Little Perle" is a 30m
  Moonen; likely a graph misattribution. Skipped.
- **The Jackson** (graph: 37m, Horizon, 2017) — the only well-documented
  "The Jackson" is an unrelated 62.5m Sydney Harbour commercial dinner-
  cruise vessel, not a private Horizon yacht. Skipped.
- **Barbara Anne** (graph: 59m) — the only documented "Barbara Anne" is a
  40.9m Baglietto DOM 133 (2024), 18m short. Skipped.
- **Burrasca** (graph: 64.5m, `van-der-graaf`) — the only documented
  "Burrasca" is a 55.7-58m Perini Navi sailing yacht; neither size nor
  builder matches. Skipped.
- **Marguerite** (graph: 65m, Codecasa) — the only documented "Marguerite"
  is a 60.97m Lürssen (2004); no Codecasa "Marguerite" found. Skipped.
- **Hampshire II** (TWO graph nodes, 58m and 66.25m, both `built_by:
  feadship`) — the only documented "Hampshire II" is a 78.5m Feadship,
  matching neither node's size. BOTH skipped rather than force a mismatched
  dataset onto either.

**Ambiguous pairs left unmerged (item 3), NOT spec'd from a mismatched
candidate:**
- **Katina** (second node, id `katina-benetti`, builder Benetti) — the
  well-documented 60m "Katina" is a Brodosplit hull (spec'd below, under
  the OTHER "Katina" node); no separate Benetti-built "Katina" was found
  publicly. Left unresolved rather than assumed to be the same vessel.
- **Lady Beth** (second node, id `lady-beth-lurssen`, builder Lürssen) —
  the well-documented 54.86m "Lady Beth" is a Newcastle Marine hull (a
  separate, already-existing graph node); no Lürssen "Lady Beth" was found.
  Left unresolved.

**Skipped entirely (generic/insufficient data, no confident public-record
match — per the researcher's own "skip and flag" guardrail):** Angel,
Firebird, Sea Eagle, Stavros (45-55m band); the ~70 single/two-word
charter-listing fragments across the 35-45m band (Alta, Aqualibra, Arsana,
Fleur, Kijo, and dozens more — see that research file's own Coverage notes
for the full list); the ~60 further under-35m/70m+ fragments the under-35m
band file's own Coverage notes lists non-exhaustively. None of these carry
enough distinguishing detail (year, value, owner, or a unique feature) to
confirm a specific real hull.

**"Per model spec" rows preserved verbatim:** Sonishi, Aix, Rising Dawn
(35-45m band) use a named production model's own published spec sheet as
a reasonable stand-in where the graph's LOA matches the model closely —
Notes flag this explicitly per the research doc's own convention; treat as
an estimate, not a confirmed hull fact.

**Additive-only rows (previously partially spec'd by an earlier
pass/round, this round fills a still-blank field rather than conflicting):**
EIV (draft, previously blank), Lady Moura (GT, previously blank), Lionheart
(beam/draft/GT, previously blank) — no conflict expected; `yachtSpecMapper.js`'s
first-non-empty-wins merge simply fills the gap.

## 55-70m band (research/round5/yacht-specs-55-70m.md)

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nomad | Oceanfast | 2003 | 69.5 | 11.58 | 3.0 | 1,260 | 18 max / 15 cruise | | | | | Same real vessel as the graph's messier "**Nomad** (ex-Aussie Rules)" node — merge candidate (graphCleanup.js's YACHT_MERGE_MAP), not duplicated here. |
| Saluzi | Austal Ships | 2003 | 69.1 | 13.8 | 2.4 | 1,739 | 16 max / 14 cruise | | | | | Day-charter configuration for up to 50 guests (25 staterooms). |
| Vassa | Feadship | 2012 | 68.77 | 11.2 | 3.65 | 1,274 | | | | | | De Voogt naval architecture, RWD interior. |
| Ragnar | ICON Yachts (1971-built hull, converted/launched as a yacht 2020) | 2020 | 68.2 | 14.0 | 3.15 | 2,272 (post-redesign; one source cites 2,450) | | | Malta | Bureau Veritas | | Viking-themed expedition conversion; RWD redesign. Some brokers list a later resale/rename to "Q" — not corroborated as the same graph identity. |
| Wayfinder | Astilleros Armón | 2021 | 68.2 | 14.4 | 3.5 | 1,737 | 20 max / 14 cruise | 4,400 @ 13kn | | | | Bill Gates's catamaran-hulled support/"shadow" vessel (Incat Crowther naval architecture); IMO Tier III compliant. |
| Argus | Svendborg Skibsværft (1971 build; converted to an expedition yacht, major 2022 refit) | 1971 / 2022 | 68.5 | 12.0 | 4.6 | | | | | | 7104752 | Originally a Danish government inspection/lighthouse-tender vessel. Duplicate graph node (id `argus-custom`) merge candidate, not duplicated here. |
| Sycara V | Nobiskrug | 2010 | 68.15 | 12.52 | 3.6–3.76 (sources vary) | 1,566 | | | | | | |
| Amor a Vida | CRN | 2025 | 67.55 | 11.8 | 3.3 | 1,447 | 17 max / 12 cruise | | | | | First hybrid-propulsion CRN superyacht. Duplicate graph node (id `amor-a-vida-crn-yachts`) merge candidate, not duplicated here. |
| Loon | Icon Yachts | 2010 | 67.5 | 11.4 | 3.4–3.8 (sources vary) | 1,295 | 16 max / 13 cruise | 6,000 | | | | Icon Yachts' flagship; ex "Icon". RWD design. Duplicate graph node (id `loon-icon`) merge candidate, not duplicated here. |
| Vertigo | Alloy Yachts | 2011 | 67.2 | 12.53 | 5.05 | 837 | | | Marshall Islands | | | Sailing yacht; Dubois/Vitruvius naval architecture, Liaigre interior. |
| Calex | Benetti | 2022 | 67.0 | 10.6 | 3.1 | 1,249 | 16 max | | | | | |
| Okto | ISA Yachts | 2014 | 66.4 | 10.5–11.0 (sources vary) | 3.35 | 1,149 | 18.5 max / 16 cruise | 6,800 | | | | Andrea Vallicelli naval architecture, Alberto Pinto interior. |
| Alchemy | Rossinavi | 2023 | 65.7 (also cited 66) | 11.31 | 3.11 | 1,194 | 16 max / 12 cruise | 4,000+ | | | | Diesel-electric pod-drive propulsion; Vitruvius Yachts (Philippe Briand) design. The graph's "Alchemia" node is a spelling-variant duplicate — merge candidate, not duplicated here. |
| Z | Amels | 2014 | 65.7 | 12.28 | 3.85 | 1,503 | 17 max / 14 cruise | 5,000 | | | | Tim Heywood exterior, Winch Design interior. |
| Triumph | Benetti | 2021 | 65.4 | 11.2 | 3.5 | 1,244 | 16.5 max / 15 cruise | 4,700 | | | | Giorgio M. Cassetta exterior. |
| Joia The Crown Jewel | Codecasa | 2010 | 65.23 | 11.2 | 3.7 | 1,278 | 17 max | 5,000 | | | | |
| Artisan | Benetti | 2019 (refit 2024) | 65.0 | | | | 16 max / 14 cruise | | | | | Described as "the largest yacht sold in 2025" by IYC; beam/draft/GT not located this pass — left blank rather than guessed. |
| Eternity | Codecasa | 2010 | 65.0 | 11.2 | 3.5 | 1,046 | 17 max / 14 cruise | | | | | Graph attributes builder as "custom" — corrected here to Codecasa per BOAT International/YachtBuyer. A separate, much smaller 2023 Mangusta/Overmarine "Eternity" (~49.9m) and a 2023 33m Mangusta "Eternity" also exist publicly — not to be conflated. |
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
| Roma | Viareggio Superyachts (VSY) | 2010 | 61.8 | 11.0 | 3.0 | 1,090 | 17 max / 14 cruise | 6,000 | | | | Espen Øino design. The graph's "RoMa" node (differently-cased) is the same vessel — merge candidate, not duplicated here. |
| Sealion | Viareggio Superyachts (VSY) | 2009 | 61.8 (graph: 62) | 11.0 | 3.1–3.2 | 1,056 | 17 max / 15.5 cruise | 4,500 | | | | Espen Øino design. |
| Mary-Jean II | ISA Yachts | 2010 | 61.73 | 12.0 | 3.2 | 1,238 | | | | | | |
| Saramour | CRN | 2014 | 61.3 | 10.2 | 3.1 | 1,080 | 15 max | | | | | Francesco Paszkowski design. |
| Rock.It | Feadship | 2014 | 60.35 | 10.8 | 3.3 | 1,052 | | | | | | |
| Sarastar | Mondomarine | 2016/2017 (sources vary) | 60.22 | 10.75 | 2.9 | 979 | | | | | | |
| After You | Damen Yachting (Xplorer 60) | 2025 | 60.2 (graph: 60) | 11.0 | 3.6 | 1,160 | 14.5 max | 5,000 | | | | First Xplorer 60; won Robb Report's Best Explorer Yacht award. Two further graph duplicate nodes (id `after-you-damen-yachting`, `after-you-xplorer`) are merge candidates, not duplicated here. A different, unrelated 2011 Heesen "After You" (~55m) also exists publicly but is not in this graph's node set. |
| Bella Vita | Lürssen | 2010 | 60.0 | 11.43 | 3.5 | 1,218 | 16 max / 11 cruise | 5,000 | | | | Espen Øino exterior, Glade Johnson interior. |
| Katina | Brodosplit | 2015 | 60.0 | 10.68 | 2.9 | 1,212 | 14 max / 12 cruise | 4,000 | Marshall Islands | | | The graph's SECOND "Katina" node (builder Benetti) is left unresolved — no separate Benetti-built "Katina" was found publicly; not the same vessel as this row. |
| Alfa G | Oceanco | 2004 | 60.0 | 10.5 | 3.89 | 1,184 | 15 max / 12 cruise | | | | | |
| Katana | Perini Navi | 2025 | 60.0 | 11.4 | Retractable keel (max draft unconfirmed) | 491 | 15.5 max / 12 cruise | 3,500 | | | | Fourth hull of Perini Navi's 60m ketch series; carbon masts/rigging, dynamic positioning. |
| Formosa | Benetti | 2015 | 60.0 | 10.6 | 3.37 | 1,089 | 16.5 max / 14 cruise | | | | | Sinot interior. |
| Andreas L | Benetti | c.2016 | 60.0 | 10.4 | 3.5 | 971 | 16 max / 15 cruise | | | | | Rename chain reported across brokers: Amnesia → Andreas L → MIMI → LA BLANCA (the graph's own "La Blanca" node is a DIFFERENT, unrelated 41.7m Sunseeker — not conflated). The graph's "Andrea L" node is a spelling-variant duplicate — merge candidate, not duplicated here. |
| St David | Benetti | 2008 | 60.0 | 10.4 | 3.6 | 969 | | | | | | Ex "Xanadu"; Winch Design. Duplicate graph node (id `st-david-custom`) merge candidate, not duplicated here. |
| Vision | Benetti | 2011 | 60.0 | 10.41 | 3.4 | 1,008 | 16 max / 15 cruise | 5,000 | | | | Pierre-Yves Rochon interior. |
| ENTOURAGE | Amels | 2023 | 60.0 | 10.4 | 3.35 | 830 | | | | | | Amels 60 Limited Editions series; ex-project "Witchcraft". |
| MEMORIES | Amels | 2025 | 60.0 | 10.4 | 3.35 | 853 | | | | | | Amels 60 Limited Editions series. |
| Stella Mi | Amels | 2021 | 60.0 | 10.6 | 3.4 | 1,015 | 16 max / 14 cruise | 4,500 | | | | Also listed by brokers as "Stella M". |
| Come Together | Amels | 2022 | 60.0 | 10.4 | 3.35 | 853 | | | | | | Amels 60 Limited Editions series; award-winning design. Two further graph duplicate nodes (id `come-together-custom`, `come-together-y-co`) are merge candidates, not duplicated here. |
| O'Madeleine | Golden Yachts | 2025 | 60.0 | 11.0 | 3.05 | 1,305 | | | | | | Greek-built superyacht. |
| Scott Free | Abeking & Rasmussen | 2009 | 60.0 | 10.7 | 3.53 | 1,090 | 16 max / 14 cruise | | | | | |
| Maximus | Vitters | 2023 | 59.0 | 10.2 | 8.0 | 395 | 13 max | 3,000 | | | | German Frers design; ketch-rigged, twin rudders — draft is deliberately deep (performance sailing yacht). |
| Idol | Austal Ships (as "Oceanfast") | 2007 | 58.9 | 10.55 | 2.57 | 903 | 17 max / 15 cruise | 4,000 | | | 1008205 | |
| Capri I | Lürssen | 2003 | 58.55 (graph: 58.6) | 11.43 | 3.5 | 1,226 | | | | | | Graph attributes builder as "Proteksan-Turquoise" — corrected here to Lürssen per BOAT International/YachtBuyer. |
| Pink Shadow | Damen Yachting (Xplorer 58) | 2023 | 58.3 (graph: 58) | 11.0 | 3.6 | 1,091 | 14.5 max | 5,000 | | | | Only Xplorer 58 hull built. Two further graph duplicate nodes (id `pink-shadow-custom`, `pink-shadow-y-co`) are merge candidates, not duplicated here. |
| Twizzle | Royal Huisman | 2010 | 57.49 (graph: 57) | 11.6 | | 498 | 14 max / 12 cruise | 4,000 | | | | Dubois naval architecture, RWD exterior, Todhunter Earle interior. |
| Elis et Mar | Trinity Yachts | 2012 | 57.03 (graph: 57) | 10.21 | 2.5 | 782 | | | | | | |
| The Wellesley | Oceanco | 1993 (refit 2016) | 56.2 (graph: 56) | 9.1 | 3.1 | 608 | | | | ABS | 8990495 | |
| Zenji | Perini Navi | 2004 | 55.9 (graph: 56) | 11.52 | 9.73 | 499 | 16 max / 11 cruise | | | | | Sailing yacht; Ron Holland exterior, Perini Navi interior. |
| Aelia | Benetti | 2015 | 55.85 (graph: 56) | 10.6 | 3.3 | 988 | 15.5 max / 15 cruise | | | | | |
| Geco | Admiral — The Italian Sea Group | 2020 | 55.2 (graph: 55.2) | 8.6 | 2.25 | 499 | | | | | | |
| Moskito | Heesen | 2021 | 55.0 | 9.6 | 2.85 | 760 | 15.5 max | 4,500 | | | | Heesen 55 Steel series. |
| Reliance | Heesen | 2023 | 55.0 | 9.6 | 3.17 | 760 | 15.5 max / 13 cruise | 4,500 | | | | Heesen 55 Steel series, 6th hull; Omega Architects exterior, Luca Dini interior. |
| Solemates | Heesen | 2025 | 55.0 | 9.6 | 2.7–3.15 (sources vary) | 760 | 15.5 max | 4,500 | | | | Heesen 55 Steel series. Unrelated to the different Lürssen 60m ex-name "Solemates" noted under "Bella Vita" above. |
| Loewe | Tankoa (T55 Sportiva, 2nd hull) | 2025 | 55.0 | 9.0 | 2.4 | 499 | 17.5 max / 15 cruise | 5,000 | | | | Luca Dini exterior. The graph's OTHER "Loewe" node (whose own cached builder reference nonsensically points to a "sportiva-55" artifact) is a merge candidate onto THIS correctly-attributed node, not duplicated here. |
| Sportiva 55 | Tankoa | 2025 | 55.0 | 9.0 | 2.4 | 499 | 17.5 max / 15 cruise | 5,000 | | | | This graph entry's name is the MODEL name (T55 Sportiva), not an individual hull name — a separate, legitimate node, NOT part of the Loewe duplicate cluster. The series' first hull is publicly named "Rose" (2025); this row is left as the generic model spec rather than assigned to either "Rose" or "Loewe" without evidence. |
| Revelry | Amels | 2012 | 54.3 (graph: 55) | 9.0 | 3.15 | 642 | 15.5 max / 13 cruise | | | | | Graph attributes builder as "Delta Marine" — corrected here to Amels per BOAT International/YachtBuyer. |

## 45-55m band (research/round5/yacht-specs-45-55m.md)

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ad Astra | Kolotura | 2026 | 52.5 | 10.05 | 3.6 | | 12 | | | | | Custom motor-sailer, cruising speed 10 kn. |
| Adri | Radez | 2024 | 45.5 | 10.05 | 3.7 | ~425 | 12 | | | | | Motor-sailer; cruising speed 10 kn. GT approximate (single-source). |
| Anthea | Radez | 2020 | 52 | 8.5 | 3.0 | 499 | 12 | | | | | Cruising speed 10 kn; 20 guests / 10 cabins / 11 crew. |
| ArtExplora | Perini Navi | 2023 | 47 | 17.1 (cat. beam) | 3.54 | 498 | ~10 | | | | | Real name is **ArtExplorer** — world's largest aluminium sailing catamaran, an itinerant art/culture vessel (Fondation ArtExplora), not a private charter yacht. Beam figure is full catamaran beam, not comparable to monohull beams elsewhere in this table. |
| Avalon | Delta Marine | 2009 | 46 | 9.7 | 2.74 | 472 | 15.5 | 5000 | Cayman Islands | | 9470636 | |
| Big Eagle | Mie (Zosen) | 1980 | 52.43 | 7.92 | 2.74 | 399 | 14 | 5000 | St Vincent & Grenadines | | 7916430 | |
| Big Easy | Royal Hakvoort | 2002 | 44.9 | 8.76 | 2.79 | 491 | 14 | 5000 | | | | Graph LOA rounds to 45; public record is 44.7-44.9m. |
| Black Swan | Odisej (Shipyard) | 2018 | 49.2 | | 1.85 | | 12 | | | | | Croatian-built boutique cruise vessel, refit 2024; 20 guests / 10 cabins / 13 crew. GT/beam/range not found in public listings. |
| Da Vinci | Overmarine (Mangusta 165E) | 2017 | 49.9 | 9.2 | 1.7 | 485 | 37 | 900 | Cayman Islands | | 9823223 | Planing performance yacht, not displacement — hence low range at 20 kn. |
| DB9 | Palmer Johnson | 2010 | 52.36 | 9.5 | 2.44 | 495 | 30 | 4000 | | | | First hull of Palmer Johnson PJ170 SportYacht range. A second graph node (`yacht:db9-palmer-johnson`, LOA rounded to 50m by a different source doc) is the same real vessel — left unmerged this round (not one of item 3's grounded 17 clusters), documented here for a future pass. |
| Deniki | Amels (Limited Editions) | 2007 | 52.3 | 9.0 | 3.15 | 628 | 15.5 | 4500 | Malta | | 1009077 | |
| DUNIA BARU | Konjo Boat Builders | 2014 | 51 | 11.0 | 4.2 | | 12 | 3500 | | | | Indonesian phinisi, refit 2020; 14 guests / 7 cabins / 18 crew. Graph `builderId` is null — confirmed builder is Konjo. |
| EIV | Rossinavi | 2020 | 48.8 | 8.9 | 2.29 | 498 | 19 | 3600 | | | | Adds draft (previously blank in knowledge/93's own EIV row) — additive, not a conflict. |
| Emotional | Damen Yachting | 2025 | 53.25 | 8.7 | 3.05 | 497 | 19 | 5000 | | | | Damen 5303 (support/explorer-style) yacht. |
| Endeavour 2 | Rossinavi | 2017 | 49.91 | 8.8 | 2.2 | 499 | 16 | 5000 | | | | Diesel-electric propulsion; 10 guests / 5 cabins / 8 crew. |
| Eternal Spark | Bilgin Yachts | 2024 | 49.95 | 9.25 | 2.6 | 499 | 16.5 | | | | | Bilgin 163 model. |
| Euphoria II | Mayra Yachts | 2016 | 49.56 | 8.53 | 2.7 | 495 | 16.5 | 4500 | | | | |
| Felicità | Overmarine (Mangusta Oceano 50) | 2025 | 49.9 | 9.12 | 2.56 | 499 | 16 | 4000 | | | | |
| Highlander | Feadship | 1986 | 49.45-49.99 | 8.59-8.92 | 2.95-3.20 | 447 | 16 | 4000 | Marshall Islands | | 8668030 | Famous Jon Bannenberg-styled yacht (ex "The Highlander"). 12 guests / 7 cabins / 11 crew. |
| Impromptu | Trinity Yachts | 2010 | 49.9-50.01 | 8.5 | 2.7 | 490 | 20 | 3816 | Cayman Islands | | 9599640 | |
| Joy Me | Philip Zepter Yachts | 2011 | 49.91-49.95 | 9.12 | 2.55 | 620 | 14 | 4000 | | | | Graph `builderId` "philip-zepter" confirmed — not Sanlorenzo. |
| Liberty | ISA (Ancona) | 2011 | 49.99 | 9.0 | 3.0 | 495 | 16.8 | 2200 | Cayman Islands | Lloyd's Register (MCA compliant) | 1011214 | Refit 2021. |
| NORTHERN SUN | Narasaki Shipbuilding | 1976 | 50.9 | 9.0 | | 703 | 13 | | | | | Refit 2019; ex fishing/support-type hull converted to expedition yacht. Graph `builderId` is null — confirmed builder is Narasaki. |
| Oriy | Radez | 2026 | 49.98-50 | 8.95 | 2.45 | 499 | 16 | 4500 | | | | Graph builder recorded as "custom"; confirmed actual builder is Radez d.d. Shipyard, Croatia. |
| Para Bellvm | Sanlorenzo (500 EXP) | 2023 | 47 | 9.6 | 2.8 | 499 | 16 | 4000 | | | | |
| Prana | Alloy Yachts | 2006 | 51.7 | 10.2 | 4.88 | 384 | 15 | 5000 | Cayman Islands | | 1008970 | Dubois-designed sailing yacht, 63.4m rig. |
| Privacy | Christensen | 2004 | 47.24 | 9.02 | 2.29 | 498 | 18 | 4000 | | | | 8979881 |
| Sairu | Riva | 2025-2026 | 54.84 | 8.6 | 2.23 | 499 | 18 | 3600 | | | | Riva's largest yacht to date (Riva 54 Metri flagship); first-of-class, newly delivered so flag/IMO not yet indexed. |
| Seagull | Uljanik (Shipyard) | 1952 | 54.16 | 8.41 | 2.4 | 475 | 14 | 3400 | Malta | | 5382996 | Public record name is "Seagull II" (1952 ferry, rebuilt 2004-05 into a luxury motor yacht); graph's "Seagull" is treated as the same vessel — former/short name in Notes. |
| Seven Sins | Sanlorenzo (52Steel) | 2017 | 52 | 9.3 | | 499 | 17 | 4400 | Cayman Islands | | 9822827 | |
| Teleost | Feadship | 1998 | 49.07 | 8.51 | | 487 | 14 | 4500 | Cayman Islands | | 1006219 | Refit noted in graph ("1998 (refit)"); delivery year is also 1998 per Feadship record. Graph `builderId` is null — confirmed builder is Feadship. |
| Triton | Delta Marine | 2004 | 49.68-49.7 | 9.65 | 2.8 | 527 | 16 | 6100 | Marshall Islands | ABS | 9093799 | Full-displacement expedition yacht. |
| Xwave | Benetti (B.Now 50M) | 2025 | 49.9 | 9.2 | 2.6 | 500 | 15 | 4500 | | | | First-of-class RWD-designed B.Now 50M; too new for flag/IMO to be indexed yet. |

## 35-45m band (research/round5/yacht-specs-35-45m.md)

Band is fragment-heavy (~75 candidate nodes, overwhelmingly single/two-word
charter-listing entries with no distinguishing detail — see that research
file's own Coverage notes); only 4 rows carry hull-specific or high-
confidence model-spec data. "The Jackson" is a same-name conflict, excluded
per this file's own Curation notes above.

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| De Lisle III | Gulf Craft | 2008 (refit 2018/2024) | 42 | 7.5 | 2.2 | ~400 (est., not published) | 10.5 cruise | | Australia | | | Hull-specific data found (Whitsundays charter yacht, interior by Sam Sorgiovanni); GT not published by any source found — estimated only, do not treat as confirmed. |
| Sonishi | Sunseeker | — | 40.05 | 8.09 | 2.85 (full load) / 2.7 (half load) | 338 | | | | | | **Per model spec.** LOA (40.05 m) matches the Sunseeker "40 Metre Yacht" (hull series 131) to the centimetre — high-confidence model match, but beam/draft/GT below are the model's published nominal figures, not confirmed for this specific hull. |
| Aix | Sanlorenzo | 2022 | 44 | 9 | 2.4 (full load) | 440 | 23 max / 13 cruise | 3,000 | | | | **Per model spec.** Graph LOA (44 m) is close to the Sanlorenzo 44Alloy's nominal 44.5 m; beam/draft/GT/speed/range are the model's published spec, not confirmed for this hull. |
| Rising Dawn | Gulf Craft | — | 43 | 8.3 | 2.21 | ~360–398 (sources vary) | | | | | | **Per model spec.** Graph LOA (43 m) is close to the Gulf Craft Majesty 140's nominal 43.12–43.55 m; specs are the model's published range, not confirmed for this hull. |

## Under-35m + 70m+ stragglers (research/round5/yacht-specs-under35m.md)

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Blohm+Voss | 2008 | 119.0 | 18.87 | 5.15 | 5959 | 23 | 4250 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Owner Andrey Melnichenko; design Philippe Starck / Martin Francis. Graph previously had only LOA/year/former-name ("Topaz" — a DIFFERENT yacht, "A+", not this one); GT/beam/draft/speed/range added this round. Do not confuse with the separate *sailing* yacht "Sailing Yacht A" (same owner) already spec'd in knowledge/93. |
| Alexander | Lübecker Flender-Werke | 1965 | 121.8 | 16.9 | 5.8 | 5933 | 18 | 4722 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Ex-Stavros Niarchos family yacht (delivered 1966), later Latsis family, now reported owned by the Saudi royal family. |
| Batello | Oceanco | 2007 | 80.0 | 14.2 | 3.9 | 2500 | 20 | N/A | N/A (unverified) | N/A (unverified) | N/A (unverified) | Same real Oceanco Y701 vessel as the graph's "Amevi" node under successive names (Aalto → Amevi → Batello, current) — merge candidate (graphCleanup.js's YACHT_MERGE_MAP, item 3), consolidated onto the current name; `yachtSpecMapper.js`'s `FORMER_NAMES_MAP` gains `batello: ['Amevi', 'Aalto']`. |
| Hasna | Feadship | 2017 | 73.0 | 11.9 | 3.45 | N/A (unverified) | N/A | N/A | N/A (unverified) | Lloyd's Register | N/A (unverified) | Delivered to first owner John Symond (2017); sold 2020 to Yahn Bernier and renamed *Lunasea*. Corpus/graph entry retains the original name — no separate "Lunasea" node exists in this graph to merge onto. |
| IJE | Benetti | 2019 | 108.0 | 15.5 | 4.4 | 3367 | N/A | N/A | N/A (unverified) | N/A (unverified) | N/A (unverified) | Benetti's flagship "gigayacht" (FB275) at delivery. |
| Lady Moura | Blohm+Voss | 1990 | 104.85 | 18.5 | 5.4 | 6539 | 20 | 8000 | Nassau | N/A (unverified) | 1002380 | Adds GT (previously blank) — additive, not a conflict; draft/flag/IMO already present from an earlier pass. One of the first true "megayachts." |
| Lionheart | Benetti | 2016 | 90.0 | 14.4 | 4.5 | 2990 | 18 | N/A | N/A (unverified) | Lloyd's Register | 1012323 | Adds beam/draft/GT (previously blank) — additive, not a conflict. Part of Larry Green's fleet per corpus notes. |
| O'Pari | Golden Yachts | 2020 | 95.0 | 13.8 | 3.6 | 2743 | 18 | 8600 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Golden Yachts charter-fleet flagship; interior/exterior by Studio Vafiadis. |
| Project X | Golden Yachts | 2022 | 87.6 | 14.8 | 4.4 | 2974 | 18.2 | 5500 | N/A (unverified) | N/A (unverified) | N/A (unverified) | Exteriors by Ken Freivokh, interiors by Massari Design. |
| Corroboree | Lloyds Ships | 1988 (refit) | 33.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Classic Great Barrier Reef charter vessel, ~$5M per corpus. Beam/draft/GT/speed not independently corroborated this round — too thin a public record; kept because year+value+distinguishing feature make it a real, specific vessel rather than a generic fragment. |
| Iron Blonde | Numarine | 2012 | 30.0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Explorer-style, South Pacific charter, ~$8M per corpus. Likely Numarine's 26XP/30XP explorer line by size, but exact model not confirmed. |

## Sources

See each `research/round5/yacht-specs-*.md` file's own Sources section for
the full per-yacht citation list (Boat International, SuperYachtTimes,
YachtHarbour, YachtBuyer, YachtCharterFleet, Superyachts.com, itBoat,
Fraser Yachts, Northrop & Johnson, Edmiston, Y.CO, Moran Yacht & Ship,
VesselFinder/MarineTraffic/ShipSpotting, builder official fleet pages,
Wikipedia).
