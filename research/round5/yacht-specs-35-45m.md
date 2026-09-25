# Yacht Spec Completion — Round 6, Lane R (35–45 m LOA band)

Research pass targeting yachts in the graph (`ingest/data/graph.json`, 599 yacht
nodes) whose LOA falls in the 35–45 m band and which lack a `gt` (gross
tonnage) attribute, to close the beam/draft/GT/speed/range/flag/class-society/
IMO gap identified in the beat-Wikipedia analysis.

**Extraction method:** No script-execution tool was available in this
environment, so the priority list was built by grepping `"meters": (3[5-9]|
4[0-4])` inside the `loa` block across the yacht-node byte range of
`graph.json` (lines ~54,653–74,190), then reading the surrounding node JSON by
hand to pull `name`, `_resolution.builderId`, `year`, `value`, and confirm the
absence of a `gt` key. This produced **~75 candidate yacht nodes** in the
35–45 m band lacking GT (and, for nearly all of them, lacking beam/draft/
speed/range/flag/class/IMO too).

**What this band actually looks like:** unlike the ≥70 m band researched in
earlier rounds (dominated by well-documented named superyachts with
Wikipedia pages), the 35–45 m band in this graph is overwhelmingly populated
by single- or two-word charter-listing entries pulled from broker/charter-guide
corpus documents (`41_Comprehensive_Monaco_Yacht_Charter_Guide.md`,
`42_Monaco_Yacht_Show_Key_Players_Charters.md`, `37_Alaska_Yacht_Clubs_and_
Charters_Data.md`) with no year, no hull number, and often a generic or
"various" builder tag. These names (*Alta*, *Aqualibra*, *Arsana*, *Fat Bob*,
*Gioia*, *Grey*, *Le Verseau*, *No.9*, *Stellamar*, *Thumper*, etc.) are not
reliably disambiguable via web search — the same name is commonly reused
across multiple unrelated charter boats, and none of the identifying details
in the graph (LOA to the nearest 0.1 m, cabin count) are unique enough to
confirm a specific hull with confidence. Per the researcher guardrails, these
are flagged and skipped rather than guessed.

A small number of candidates *do* carry enough distinguishing data (a
builder + year + estimated value, usually sourced from
`20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md`) to be worth a
targeted web check, and a few match a named production model closely enough
in LOA that the model's published spec sheet is a reasonable stand-in for the
hull spec ("per model spec" in Notes). Those are researched below. Everything
else is listed with only the graph's existing LOA/builder/year and flagged as
skipped.

## Researched (hull-specific or high-confidence model match)

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| De Lisle III | Gulf Craft | 2008 (refit 2018/2024) | 42 | 7.5 | 2.2 | ~400 (est., not published) | 10.5 cruise | | Australia | | | Hull-specific data found (Whitsundays charter yacht, interior by Sam Sorgiovanni); GT not published by any source found — estimated only, do not treat as confirmed. |
| Sonishi | Sunseeker | — | 40.05 | 8.09 | 2.85 (full load) / 2.7 (half load) | 338 | | | | | | **Per model spec.** LOA (40.05 m) matches the Sunseeker "40 Metre Yacht" (hull series 131) to the centimetre — high-confidence model match, but beam/draft/GT below are the model's published nominal figures, not confirmed for this specific hull. |
| Aix | Sanlorenzo | 2022 | 44 | 9 | 2.4 (full load) | 440 | 23 max / 13 cruise | 3,000 | | | | **Per model spec.** Graph LOA (44 m) is close to the Sanlorenzo 44Alloy's nominal 44.5 m; beam/draft/GT/speed/range are the model's published spec, not confirmed for this hull. |
| Rising Dawn | Gulf Craft | — | 43 | 8.3 | 2.21 | ~360–398 (sources vary) | | | | | | **Per model spec.** Graph LOA (43 m) is close to the Gulf Craft Majesty 140's nominal 43.12–43.55 m; specs are the model's published range, not confirmed for this hull. |
| The Jackson | Horizon (per graph) | 2017 | 37 | | | | | | | | | **Conflict, not resolved.** The only "The Jackson" found with strong web presence is an unrelated 62.5 m Sydney Harbour dinner-cruise/event vessel (steel hull, aluminium superstructure, up to 700 pax) — a commercial function-boat, not a 37 m private Horizon yacht. Could not confirm the graph's 37 m/Horizon/2017/$20M entry against any source; flagged for QA rather than merged. |

## Skipped — generic charter-listing name, insufficient data to disambiguate

All of the below have only LOA, builder tag, and (where shown) cabin/guest
count in the graph — no year, no hull number, no broker listing found that
uniquely matches. Builder is as recorded in the graph's `_resolution.
builderId` (may be a broad/aggregated tag rather than a confirmed yard).
GT/beam/draft/speed/range/flag/class/IMO are blank because no confident
source was found this pass; do not treat blanks as zero.

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ad Astra | Moonen | | 37.4 | | | | | | | | | Generic charter name; two separate "Ad Astra" nodes in graph (Moonen, Benetti) — likely different hulls, neither disambiguated. |
| Ad Astra | Benetti | | 40 | | | | | | | | | See note above. |
| Alta | (custom) | | 43.89 | | | | | | | | | |
| Antheya III | Princess | | 35.15 | | | | | | | | | |
| Aqualibra | (custom) | | 40 | | | | | | | | | |
| Arsana | Amer | | 35.5 | | | | | | | | | |
| Arya | Newcastle Marine | | 40.6 | | | | | | | | | |
| Aurum Sky | Odisej | | 43.5 | | | | | | | | | |
| Away | Sanlorenzo | | 37.44 | | | | | | | | | LOA doesn't match a current Sanlorenzo model tier cleanly; likely an older/secondhand semi-custom hull, not identified. |
| Babbo | Cantiere delle Marche | | 43 | | | | | | | | | |
| Brooklyn | Custom Line | | 37 | | | | | | | | | |
| Charade | Benetti | | 38.1 | | | | | | | | | |
| Desamis B | Benetti | | 40 | | | | | | | | | |
| El Rey | Deep Sea Marine | | 35 | | | | | | | | | |
| Element | Cantieri di Pisa | | 42 | | | | | | | | | |
| Emocean | (custom) | 2021 | 38.2 | | | | | | | | | Has a year but no builder/hull identifier found; not confirmed. |
| Fat Bob | Azimut/Magellano | | 43 | | | | | | | | | |
| Fleur | Sunseeker | | 35.5 | | | | | | | | | Sunseeker builds several models in this range; LOA alone insufficient to pick one. |
| Fortitude | Benetti | | 44.1 | | | | | | | | | |
| FX | FX Yachts | | 38 | | | | | | | | | |
| Ghost II | Gulf Craft | 2016 | 37 | | | | | | | | | Has year/value ($10M) but no confident hull match found. |
| Gioia | Codecasa | | 43 | | | | | | | | | |
| Grand Illusion | Palmer Johnson | | 44 | | | | | | | | | |
| Grey | Sunseeker | | 40 | | | | | | | | | |
| Haze II | (unknown) | | 44 | | | | | | | | | |
| Impulsive | Numarine | | 40 | | | | | | | | | |
| Infinity Pacific | (unknown) | 2007 | 40 | | | | | | | | | |
| Kai | Sunseeker | | 40 | | | | | | | | | |
| Kathleen Anne | Feadship | | 39 | | | | | | | | | |
| Kayana | Vosper Thornycroft | | 35 | | | | | | | | | |
| Kijo | Heesen | | 43.9 | | | | | | | | | Heesen builds this range as individual semi-custom hulls, not a strict model tier; LOA alone insufficient. |
| Koju | Benetti | | 37 | | | | | | | | | |
| La Blanca | Sunseeker | | 41.7 | | | | | | | | | |
| Lady Azul | Heesen | | 39.4 | | | | | | | | | |
| Largo | Sunseeker | | 35 | | | | | | | | | |
| Last Call | Intermarine USA | | 40 | | | | | | | | | |
| Le Verseau | Princess | | 40 | | | | | | | | | |
| Life Time | Heesen | | 38 | | | | | | | | | |
| Liquidity | Platinum Marine | | 37 | | | | | | | | | |
| Liv Love | Benetti | | 40.8 | | | | | | | | | |
| Lucien | Sunseeker | | 40 | | | | | | | | | |
| Mar Allure | (motorsailer, unnamed yard) | | 41.8 | | | | | | | | | |
| Maverick | Benetti | | 40.8 | | | | | | | | | |
| Maximus III | Crescent Yachts | | 37 | | | | | | | | | |
| Mirage IV | Princess | 2017 | 40 | | | | | | | | | Has year/value ($20M) but no confident hull match found. |
| Moka | Overmarine | | 42.2 | | | | | | | | | Graph carries two duplicate nodes for this name/builder/LOA — likely the same hull double-counted. |
| Morning Star | Sanlorenzo | | 36.5 | | | | | | | | | |
| No.9 | Sunseeker | | 40 | | | | | | | | | |
| Octopussy | (unknown) | | 43.6 | | | | | | | | | |
| Oracle | Pak Haji Saka | | 35 | | | | | | | | | |
| Ourway | Tenix Defence | | 36.8 | | | | | | | | | |
| Pura Vida | Moonen | | 36 | | | | | | | | | |
| Reverie | (custom) | | 39 | | | | | | | | | |
| S7 | Tansu | | 39.3 | | | | | | | | | |
| Safari Quest | Shear Yachts | | 37 | | | | | | | | | |
| Samsara Samudra | (custom) | | 42 | | | | | | | | | |
| Serengeti | Westport | | 40 | | | | | | | | | Graph note "ex-Johnny Carson" — plausible but not corroborated this pass. |
| Silentworld | (unclear builder) | | 39.5 | | | | | | | | | |
| Silver Dream | Warren Yachts | | 44 | | | | | | | | | |
| Stellamar | (custom) | | 35 | | | | | | | | | |
| Summertime II | Hatteras | | 35 | | | | | | | | | |
| Sweet Escape | (custom) | | 39.6 | | | | | | | | | |
| Takara One | Sanlorenzo | | 37.95 | | | | | | | | | |
| That's Amore | Grandi Yatcilik Mimarlik | | 42.9 | | | | | | | | | Graph carries two duplicate nodes for this name/builder/LOA. |
| The Beast | Profab Engineering | 2019 | 39 | | | | | | | | | Has year/value ($20M, South Pacific) but no confident hull match found. |
| Thumper | Sunseeker | | 40 | | | | | | | | | |
| Vauban | Sanlorenzo | | 36.92 | | | | | | | | | |
| White Star | Overmarine | | 39.2 | | | | | | | | | |
| Yamakay | (custom) | | 39 | | | | | | | | | Described as a schooner in the graph — possibly a sailing vessel, not a motor yacht; unconfirmed. |

## Sources

- [Sanlorenzo 44 Alloy — YachtBuyer](https://www.yachtbuyer.com/en/sanlorenzo/new/44alloy)
- [Sanlorenzo Alloy — Superyachts.com specs](https://www.superyachts.com/fleet/sanlorenzo-alloy-13633/specs/)
- [Sunseeker 40 Metre Yacht — YachtBuyer](https://www.yachtbuyer.com/en/sunseeker/new/40-metre-yacht)
- [Sunseeker 40M Yacht — itBoat](https://itboat.com/models/2432-sunseeker-40m-yacht)
- [Gulf Craft Majesty 100 — YachtBuyer](https://www.yachtbuyer.com/en-us/gulf-craft/new/majesty-100)
- [Gulf Craft Majesty 140 — Boat International Superyacht Directory](https://www.boatinternational.com/yachts/the-superyacht-directory/majesty-140--102701)
- [Gulf Craft Majesty 140 Specifications PDF — Majesty Yachts USA](https://www.majestyyachtsusa.com/wp/wp-content/uploads/majestyyachtsusa.com/2023/06/Specifications_20Majesty_20140_20V20190804.pdf)
- [Heesen 37m — Superyachts.com](https://www.superyachts.com/fleet/37m-heesen-9396/)
- [DE LISLE III Yacht Charter — Boatbookings](https://www.boatbookings.com/yacht/de-lisle-iii-gulf-craft-42m-luxury-crewed-motor-yacht-pid16878)
- [DE LISLE III — Northrop & Johnson](https://www.northropandjohnson.com/yachts-for-charter/de-lisle-iii-137-gulf-craft)
- [The Jackson — Sydney Harbour venue site](https://www.thejackson.com.au/)
- [VESSEL REVIEW: The Jackson — Baird Maritime](https://www.bairdmaritime.com/ausmarine/ausmarine-passenger-vessels/vessel-review-the-jackson-dinner-cruise-vessel-built-for-australias-sydney-harbour)

## Coverage notes

- **Band size:** ~75 distinct yacht nodes in the graph have LOA in [35, 45) m
  and no `gt` attribute (extracted by hand-grepping `graph.json` since no
  script-execution tool was available this pass — see Extraction method
  above). This is almost certainly an undercount of the true 35–45 m
  population, since many yachts in this band likely have a `gt` value
  already filled from an earlier pass and were correctly excluded by the
  filter, and a small number of graph entries use non-standard LOA
  encodings (e.g. `"60/197"` raw strings, or `null` meters with a `"30+"`
  raw string) that would not have been caught by the numeric regex.
- **Covered with real spec data:** 1 (De Lisle III — hull-specific).
- **Covered with model-spec substitution (flagged as such):** 3 (Sonishi,
  Aix, Rising Dawn) — GT/beam/draft/speed/range values are the named
  production model's published nominal spec, not confirmed against the
  individual hull. Treat these as a reasonable estimate, not a hull fact.
- **Flagged conflict, not merged:** 1 (The Jackson — likely name collision
  with an unrelated 62.5 m commercial vessel).
- **Skipped, insufficient data to disambiguate:** ~70. These are
  overwhelmingly single/two-word names sourced from Monaco charter-guide and
  Alaska-charter-guide corpus documents with no year, no hull number, and a
  builder tag that is sometimes a broad category rather than a specific
  yard. Per round3's precedent (`research/round3/yacht-specs.md`), these were
  deliberately left unresearched rather than guessed at.
- **Weakest fields overall:** beam, draft, GT, max speed, range, flag, class
  society, and IMO are effectively all blank across the skipped set — this
  band's coverage gap is much wider than the ≥70 m bands researched in
  earlier rounds, because the underlying source documents for 35–45 m
  yachts are charter-marketing copy rather than technical spec sheets or
  Wikipedia articles.
- **Recommendation for a future pass:** if a script-execution tool becomes
  available, re-run the extraction programmatically against the full
  35–45 m band (including non-numeric LOA encodings) to get an exact count,
  and prioritize re-research only for entries that have a `year` and
  `value` in the graph (these are more likely to be real, distinguishable
  yachts from `20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md` rather
  than generic charter-guide placeholders).
