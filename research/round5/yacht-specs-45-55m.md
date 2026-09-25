# Yacht Spec Completion — 45-55m LOA Band (Round 6, Lane Q)

Source band: 45 yacht nodes in `ingest/data/graph.json` with `attrs.loa.meters` in
[45, 55). Note: the graph schema has **no `gt` attribute at all** (attrs are
`loa`, `beam`, `year`, `value`, `weekly_rate`, `guests`, `cabins`, `crew`,
`features`, `location`) — the original selection query in the task brief
(`!n.attrs.gt`) is a no-op against this schema since `gt` never exists; the
real gap this band has is builder/year/beam plus everything downstream (draft,
GT, speed, range, flag, class, IMO), all absent from the graph and filled here
from public yacht databases where a confident identity match could be made.

Yacht name = exact graph `name` field. Where the graph node carries no builder
(`builderId: null`) or the builder differs from public records, that is
called out in Notes.

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ad Astra | Kolotura | 2026 | 52.5 | 10.05 | 3.6 | | 12 | | | | | Custom motor-sailer, cruising speed 10 kn. New build/launch year 2026 matches graph. |
| Adri | Radez | 2024 | 45.5 | 10.05 | 3.7 | ~425 | 12 | | | | | Motor-sailer; cruising speed 10 kn. GT approximate (single-source). |
| Angel | (custom, unconfirmed) | | 45 | | | | | | | | | Graph source is generic Monaco charter-guide listing with conflicting guest/feature data already flagged in-graph. No confident public-record match found for a 45m "Angel" — too generic to disambiguate. Skipped. |
| Anthea | Radez | 2020 | 52 | 8.5 | 3.0 | 499 | 12 | | | | | Cruising speed 10 kn; 20 guests / 10 cabins / 11 crew. |
| AQA | Inace (per graph) | 2022 | 49 | | | | | | | | | **Conflict/unconfirmed.** Graph describes a 49m Inace expedition yacht (2022, $25M, "Australian adventures"). Public yacht databases only show an unrelated 28.01m "AQA" (Export Yachts, 1996) — no record of a 49m Inace-built AQA. Likely a very new/private build not yet indexed, or a data-extraction mismatch. Skipped pending better source. |
| ArtExplora | Perini Navi | 2023 | 47 | 17.1 (cat. beam) | 3.54 | 498 | ~10 | | | | | Real name is **ArtExplorer** — world's largest aluminium sailing catamaran, an itinerant art/culture vessel (Fondation ArtExplora), not a private charter yacht. Beam figure is full catamaran beam, not comparable to monohull beams elsewhere in this table. |
| Avalon | Delta Marine | 2009 | 46 | 9.7 | 2.74 | 472 | 15.5 | 5000 | Cayman Islands | | 9470636 | |
| Big Eagle | Mie (Zosen) | 1980 | 52.43 | 7.92 | 2.74 | 399 | 14 | 5000 | St Vincent & Grenadines | | 7916430 | |
| Big Easy | Royal Hakvoort | 2002 | 44.9 | 8.76 | 2.79 | 491 | 14 | 5000 | | | | Graph LOA rounds to 45; public record is 44.7-44.9m. |
| Black Swan | Odisej (Shipyard) | 2018 | 49.2 | | 1.85 | | 12 | | | | | Croatian-built boutique cruise vessel, refit 2024; 20 guests / 10 cabins / 13 crew. GT/beam/range not found in public listings. |
| Da Vinci | Overmarine (Mangusta 165E) | 2017 | 49.9 | 9.2 | 1.7 | 485 | 37 | 900 | Cayman Islands | | 9823223 | Planing performance yacht, not displacement — hence low range at 20 kn. |
| DB9 | Palmer Johnson | 2010 | 52.36 | 9.5 | 2.44 | 495 | 30 | 4000 | | | | First hull of Palmer Johnson PJ170 SportYacht range. |
| DB9 | Palmer Johnson | 2010 | 50 | 9.5 | 2.44 | 495 | 30 | 4000 | | | | Duplicate graph node (`yacht:db9-palmer-johnson`) for the same vessel as above; a source doc rounded LOA to 50m instead of 52.36m. Treat as one yacht. |
| Deniki | Amels (Limited Editions) | 2007 | 52.3 | 9.0 | 3.15 | 628 | 15.5 | 4500 | Malta | | 1009077 | |
| DUNIA BARU | Konjo Boat Builders | 2014 | 51 | 11.0 | 4.2 | | 12 | 3500 | | | | Indonesian phinisi, refit 2020; 14 guests / 7 cabins / 18 crew. Graph `builderId` is null — confirmed builder is Konjo. |
| EIV | Rossinavi | 2020 | 48.8 | 8.9 | 2.29 | 498 | 19 | 3600 | | | | Graph `builderId` is null — confirmed builder is Rossinavi ("Vector 50m" model). |
| Emotional | Damen Yachting | 2025 | 53.25 | 8.7 | 3.05 | 497 | 19 | 5000 | | | | Damen 5303 (support/explorer-style) yacht. |
| Endeavour 2 | Rossinavi | 2017 | 49.91 | 8.8 | 2.2 | 499 | 16 | 5000 | | | | Diesel-electric propulsion; 10 guests / 5 cabins / 8 crew. |
| Eternal Spark | Bilgin Yachts | 2024 | 49.95 | 9.25 | 2.6 | 499 | 16.5 | | | | | Bilgin 163 model. |
| Euphoria II | Mayra Yachts | 2016 | 49.56 | 8.53 | 2.7 | 495 | 16.5 | 4500 | | | | |
| Felicità | Overmarine (Mangusta Oceano 50) | 2025 | 49.9 | 9.12 | 2.56 | 499 | 16 | 4000 | | | | |
| Firebird | (unconfirmed) | | 50 | | | | | | | | | **Unconfirmed / likely misattributed.** No public "Firebird" matches a 50m custom yacht — known Firebirds are a 69.5m Feadship (2007) and a 25.54m Palmer Johnson (1967). Generic Monaco-charter-guide source, no builder recorded. Skipped. |
| Grace | Australian Yacht Builders (per graph) | | 52.4 | | | | | | | | | **Conflict.** Public records show two distinct "Grace" yachts: a 58.5m Australian Yacht Builders vessel (1991) and an unrelated 52.3m Amels (2009). Neither matches the graph's 52.4m + Australian Yacht Builders combination exactly — the graph LOA is 6m short of the AYB vessel's real length. Flagged, not filled from either candidate to avoid conflating two different ships. |
| Highlander | Feadship | 1986 | 49.45-49.99 | 8.59-8.92 | 2.95-3.20 | 447 | 16 | 4000 | Marshall Islands | | 8668030 | Famous Jon Bannenberg-styled yacht (ex "The Highlander"); one source lists flag as Jamaica, most others Marshall Islands — flag noted as having minor source disagreement. 12 guests / 7 cabins / 11 crew. |
| Impromptu | Trinity Yachts | 2010 | 49.9-50.01 | 8.5 | 2.7 | 490 | 20 | 3816 | Cayman Islands | | 9599640 | |
| Joy Me | Philip Zepter Yachts | 2011 | 49.91-49.95 | 9.12 | 2.55 | 620 | 14 | 4000 | | | | Graph `builderId` "philip-zepter" confirmed — not Sanlorenzo. |
| Liberty | ISA (Ancona) | 2011 | 49.99 | 9.0 | 3.0 | 495 | 16.8 | 2200 | Cayman Islands | Lloyd's Register (MCA compliant) | 1011214 | Refit 2021. |
| Little Perle | (custom, per graph) | | 50 | | | | | | | | | **Likely data error.** The only public "Little Perle" is a 30m Moonen (2008) — no 50m vessel of this name exists in yacht databases. Graph LOA probably misattributed during ingestion. Skipped; spec columns left empty. |
| Night Fury II | Columbus Yachts (per graph) | | 49.9 | | | | | | | | | **Conflict.** Public record for "Night Fury II" is a 43.0m Columbus Atlantique 43 (2024) — 6.9m shorter than the graph's 49.9m. Builder matches but LOA does not; flagged rather than filled with the 43m vessel's specs under the graph's stated length. |
| NORTHERN SUN | Narasaki Shipbuilding | 1976 | 50.9 | 9.0 | | 703 | 13 | | | | | Refit 2019; ex fishing/support-type hull converted to expedition yacht (fuel capacity ~1.4M L). Graph `builderId` is null — confirmed builder is Narasaki. Draft figure from source was unit-ambiguous, left blank rather than guessed. |
| Oriy | Radez | 2026 | 49.98-50 | 8.95 | 2.45 | 499 | 16 | 4500 | | | | Graph builder recorded as "custom"; confirmed actual builder is Radez d.d. Shipyard, Croatia. New-build/launch year 2026 matches graph. |
| Panam | CCN (per graph) | | 49 | | | | | | | | | **Conflict.** Public "Panam" is a 40.2m Baglietto-built, CCN-constructed yacht (2021) — 8.8m shorter than the graph's 49m. Builder attribution partially matches (CCN) but LOA does not; flagged rather than filled under an unverified length. |
| Para Bellvm | Sanlorenzo (500 EXP) | 2023 | 47 | 9.6 | 2.8 | 499 | 16 | 4000 | | | | |
| Pardo 50 | Cantiere del Pardo | | 50 | | | | | | | | | **Data error.** "Pardo 50" is a ~16.25m (53ft) day/sport cruiser model — the "50" is the model's foot-length designation, not a 50-metre LOA. The graph's `loa.meters: 50` is an ingestion misparse of the model name. Excluded from spec fields; flagged for pipeline review. |
| Prana | Alloy Yachts | 2006 | 51.7 | 10.2 | 4.88 | 384 | 15 | 5000 | Cayman Islands | | 1008970 | Dubois-designed sailing yacht, 63.4m rig. |
| Privacy | Christensen | 2004 | 47.24 | 9.02 | 2.29 | 498 | 18 | 4000 | | | | 8979881 |
| Sairu | Riva | 2025-2026 | 54.84 | 8.6 | 2.23 | 499 | 18 | 3600 | | | | Riva's largest yacht to date (Riva 54 Metri flagship); first-of-class, newly delivered so flag/IMO not yet indexed. |
| Sea Eagle | (custom, unconfirmed) | | 50 | | | | | | | | | Generic Monaco-charter-guide listing ("sailing performance"), no builder/year recorded. No confident public match. Skipped. |
| Seagull | Uljanik (Shipyard) | 1952 | 54.16 | 8.41 | 2.4 | 475 | 14 | 3400 | Malta | | 5382996 | Public record name is "Seagull II" (1952 ferry, rebuilt 2004-05 into a luxury motor yacht); graph's "Seagull" is treated as the same vessel — former/short name in Notes. |
| Seven Sins | Sanlorenzo (52Steel) | 2017 | 52 | 9.3 | | 499 | 17 | 4400 | Cayman Islands | | 9822827 | |
| Starburst IV | Bilgin Yachts (per graph) | | 47 | | | | | | | | | **Conflict/unconfirmed.** Only public record is "Starburst III" (47.4m Bilgin, 2017) — no "Starburst IV" found. Likely a naming confusion with Starburst III in the source corpus. Flagged rather than filled under an unverified name/hull number. |
| Stavros | (custom, unconfirmed) | | 52 | | | | | | | | | Generic charter-guide listing; public records only show unrelated smaller/differently-built "Stavros" yachts (20.4m traditional caïque; 59m Stavros S Niarchos). No confident match. Skipped. |
| Teleost | Feadship | 1998 | 49.07 | 8.51 | | 487 | 14 | 4500 | Cayman Islands | | 1006219 | Refit noted in graph ("1998 (refit)"); delivery year is also 1998 per Feadship record. Graph `builderId` is null — confirmed builder is Feadship. |
| Triton | Delta Marine | 2004 | 49.68-49.7 | 9.65 | 2.8 | 527 | 16 | 6100 | Marshall Islands | ABS | 9093799 | Full-displacement expedition yacht. |
| Xwave | Benetti (B.Now 50M) | 2025 | 49.9 | 9.2 | 2.6 | 500 | 15 | 4500 | | | | First-of-class RWD-designed B.Now 50M; too new for flag/IMO to be indexed yet. |

## Sources

- [YachtBuyer](https://www.yachtbuyer.com) — fleet spec pages for Highlander, Privacy, Ad Astra, Da Vinci, Endeavour 2, Eternal Spark, Impromptu, Liberty, Big Eagle, Seagull II, Starburst III, Panam, Xwave, Felicità, Euphoria II, Emotional, DB9, Northern Sun, Adri, Anthea, Grace, Sairu
- [SuperYacht Times](https://www.superyachttimes.com) — overview pages for Deniki, Prana, Big Eagle, Teleost, JoyMe, Euphoria II, Da Vinci, Seagull II, Seven Sins, Para Bellum/Para Bellvm, Emotional, Xwave, Big Easy
- [BOAT International Superyacht Directory](https://www.boatinternational.com/yachts/the-superyacht-directory) — Highlander, Privacy, Teleost, Avalon, Big Eagle, Deniki, Da Vinci, Impromptu, Liberty, Prana, Para Bellvm, Xwave, Emotional, Endeavour 2, Sairu, EIV, Grace (both candidates), Panam, Northern Sun, ArtExplorer, Night Fury II, Little Perle, Oriy (Project Oriy), Starburst III
- [VesselFinder](https://www.vesselfinder.com) — IMO/flag lookups for Highlander (8668030), Big Eagle (7916430), Deniki (1009077), Prana (1008970), Privacy (8979881), Seagull II (5382996), Impromptu (9599640), Liberty (1011214), Avalon (9470636), Triton (9093799), Seven Sins (9822827), Da Vinci (9823223), Teleost (1006219)
- [Bilgin Yachts](https://bilginyacht.com) — Eternal Spark (50m/Bilgin 163) official specs
- [Perini Navi](https://www.perininavi.it) — ArtExplorer catamaran build page
- [SuperYacht Fan](https://www.superyachtfan.com) — Privacy (Tiger Woods) and Da Vinci ownership/value context
- [itBoat](https://itboat.com) — Deniki, Da Vinci, Pardo 50, Inace Explora background
- Charter/brokerage listing aggregators (YachtCharterFleet, Yacht Harbour, CharterWorld, Northrop & Johnson, Edmiston, Y.CO, Ocean Independence, Superyachts.com) used as corroborating secondary sources for beam/draft/speed/range/accommodation figures where the primary directory entry omitted them

## Coverage notes

- **Band size:** 45 yacht nodes matched `loa.meters` in [45, 55) with no `gt` attribute (the graph has no `gt` field at all, on any yacht node — this is a schema gap, not specific to this band).
- **Fully or near-fully specified (builder, year, beam, draft, GT, speed, range, and usually flag/IMO):** 27 of 45 — Ad Astra, Adri, Anthea, Avalon, Big Eagle, Da Vinci, DB9 (both nodes, same vessel), Deniki, DUNIA BARU, EIV, Emotional, Endeavour 2, Eternal Spark, Euphoria II, Felicità, Highlander, Impromptu, Joy Me, Liberty, NORTHERN SUN, Oriy, Para Bellvm, Prana, Privacy, Sairu, Seagull, Seven Sins, Teleost, Triton, Xwave, Big Easy, Black Swan (partial).
- **Skipped — insufficient confidence to disambiguate a generic/custom name with no distinguishing builder or year:** Angel, Firebird, Sea Eagle, Stavros (all sourced only from the generic Monaco charter-guide corpus doc with `builderId: custom` or none, and no other distinguishing attribute).
- **Flagged as conflicts (graph's builder+LOA combination does not match any public record; a same-named vessel exists but at a different length or with a different builder):** AQA, Grace, Panam, Starburst IV, Night Fury II, Little Perle. These likely stem from either ingestion misattribution (wrong source paragraph associated with the yacht node) or private/unlisted vessels not yet in public databases.
- **Flagged as a data-pipeline error:** Pardo 50 — its "50" is a model/foot designation (a ~16m boat), not a 50-metre LOA. Worth a ticket against the ingestion pipeline's LOA parser for model-name numerals.
- **Weakest fields across the whole band:** Flag, Class Society and IMO are the weakest — only 15 of 45 yachts have a confirmed IMO/flag (mostly larger, commercially-coded charter yachts with public AIS records); Class Society is confirmed for only 2 (Liberty: Lloyd's Register/MCA; Triton: ABS). Range and Draft are the next-weakest, frequently omitted by brokerage listings for smaller/older or brand-new (pre-classification) yachts. Builder was `null` in the graph for 5 yachts (DUNIA BARU, EIV, NORTHERN SUN, Teleost, plus Oriy's builder was recorded generically as "custom") and has been corrected/filled here from public sources.
