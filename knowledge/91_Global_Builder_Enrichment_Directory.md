# Global Builder Enrichment Directory

Curated from `research/round2/builder-enrichment.md` for TASK-019. Enriches
the graph's 186 pre-existing `builder` nodes (created by `yachtMapper.js`
from the yacht corpus's own Builder column, all with `"attrs": {}`) with
country, city, founded, specialty, status, parent-company, and website
data, via `builderEnrichmentMapper.js`'s `isBuilderEnrichmentTable`/
`mapBuilderEnrichmentTables`.

Unlike every other TASK-004/016/017 enrichment table, this mapper resolves
onto **existing** builder nodes by exact-then-normalized name; it only
mints a new node when neither resolution succeeds. Of the 74 Builder cells
below, 72 resolve onto a pre-existing node (53 matched the graph's node
name exactly as researched; 19 required the curation documented below) and
2 (Corsair Marine, Crescent Custom Yachts) are deliberately left
uncurated, minting new builder nodes — see "Deliberately uncurated cells"
below for why.

Builder→company `owned_by` edges (from the Parent Company column) and
builder→region `located_in` edges (from City/Country) are also created by
this mapper. The ~15 duplicate-entity pairs and 13 suspect/non-builder
nodes this research pass flagged (e.g. "CRN" vs "CRN Yachts", "Y.CO", the
five Custom/Various/Mixed placeholders) are **not** handled here — that is
a separate, heavily-tested graph-cleanup pass
(`ingest/src/mappers/graphCleanup.js`, see its own module header for the
full per-node merge/reclassify/remove/flag ledger), so this file's own
Builder column is left exactly as the research doc named each entity
(including nodes that will be merged away moments later by that pass).

## Curation notes

**Row-count discrepancy (documented, not a parsing bug):** the source
doc's own Coverage-notes line claims "37 major-tier (3+ yachts) + 38
other-tier = 75 of 186 builder nodes". The Major builders table actually
contains **36** data rows (verified by parsing both tables with
`tableParser.js` directly — Lurssen through Trinity Yachts inclusive), not
37; the Other builders table's 38 rows are correctly counted. Total: **74**
rows, not 75 — a one-off arithmetic error in the research doc's own
summary, not a parsing artifact on the ingest side.

**19 Builder cells curated to match a pre-existing graph node's exact
name** (each is a same-company truncation/qualifier difference — the
existing graph node used a shorter or differently-parenthesized form of
the same real company than this research pass's fuller/more formal
naming; the dropped qualifier is preserved in that row's own Notes cell
rather than lost):

| Research cell (original) | Curated to (matches existing node) |
|---|---|
| Heesen Yachts | Heesen |
| Turquoise Yachts (Proteksan-Turquoise) | Turquoise Yachts |
| Overmarine (Mangusta) | Overmarine |
| Princess Yachts | Princess |
| Viareggio SuperYachts (VSY) | Viareggio SuperYachts |
| Christensen Shipyards | Christensen |
| Hatteras Yachts | Hatteras |
| Ferretti (Ferretti Yachts) | Ferretti |
| Moonen Yachts | Moonen |
| Devonport (Devonport Yachts) | Devonport |
| Broward Marine | Broward |
| Pearl Yachts | Pearl |
| Vitters Shipyard | Vitters |
| Elefsis Shipyards | Elefsis |
| Hellenic (Skaramangas Shipyards) | Hellenic |
| Clelands Shipbuilding | Clelands Shipbuilding Co |
| Palumbo Group | Palumbo |
| Kleven Verft | Kleven |
| Pardo Yachts (Cantiere del Pardo) | Pardo |

Three of these curations are entangled with a duplicate-entity pair that
`graphCleanup.js` merges separately, and were deliberately resolved onto
the node that pair's merge keeps as canonical (never the one it deletes):
**"Overmarine (Mangusta)"** → "Overmarine" (not "Overmarine Group" — both
exist as separate research rows/graph nodes; each enriches its own
existing node independently, and the cleanup pass merges "Overmarine" onto
"Overmarine Group" afterward). **"Viareggio SuperYachts (VSY)"** →
"Viareggio SuperYachts" specifically, **never** the bare "Viareggio" node
(that bare node is a separate, flagged suspect — see graphCleanup.js —
believed to name the Italian shipbuilding town itself, not a company).
**"Clelands Shipbuilding"** → "Clelands Shipbuilding Co" (the fuller
existing name that pair's merge keeps as canonical), not the shorter bare
"Clelands" node the merge deletes.

**Deliberately uncurated cells (2): mint new builder nodes, not curated
onto a similarly-named existing node.** Both have a same-first-word
existing node ("Corsair Yachts", "Crescent Yachts") that a naive
prefix/suffix fuzzy match would suggest as a curation target, but in both
cases the suffix word actually DIFFERS ("Marine"/"Custom" vs "Yachts"),
not merely a truncation like the 19 cells above — and neither pair is
listed in the research doc's own "Likely duplicate-entity pairs" list.
Absent a grounding source confirming these are literally the same
real-world company (rather than two distinct builders that happen to
share a first word — a real risk in this industry, e.g. several
"Yachts"/"Marine" suffix variants exist for genuinely unrelated boat
builders), the safer choice is two small, well-attributed new builder
nodes rather than a wrong merge that would silently conflate two
different companies' history:

- **Corsair Marine** (trailerable sailing trimarans, San Diego->Vietnam,
  founded by John Walton, now owned by Seawind Catamarans) — mints
  `builder:corsair-marine`, distinct from the existing `builder:corsair-yachts`
  node.
- **Crescent Custom Yachts** (Canadian custom motoryachts, Richmond BC,
  Charles family) — mints `builder:crescent-custom-yachts`, distinct from
  the existing `builder:crescent-yachts` node.

This accounts for the ticket's "expected ~0 new" as "expected very few,
each individually justified" rather than a literal zero — two new nodes
out of 74 resolved rows.

**Parent Company column** drives an `owned_by` edge (builder -> company or
builder -> another builder, resolved by
`builderEnrichmentMapper.js`'s `resolveParentCompanyId`, reusing the same
plausibility guard and dedupe-onto-existing-node discipline built in
TASK-017's `engineMapper.js`). No Parent Company cell in either table
below narrates an ownership-change in prose (the "Formerly X; sold to Y"
shape TASK-016/017 review findings flagged) — all are bare
current-parent names, so none needed further curation for that reason.

## Major builders (3+ yachts in graph)

| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Lurssen | Germany | Bremen-Vegesack (yards in Lemwerder, Berne, Bremen-Fähr) | 1875 | custom steel/aluminium megayachts, naval vessels | active | family-owned (Lürssen family, 4th generation) | lurssen.com | 51 yachts in graph; built by Friedrich Lürssen, built first motorboat "Rems" 1886 with Daimler/Maybach |
| Feadship | Netherlands | Aalsmeer / Kaag (Royal Van Lent + Koninklijke De Vries yards) | 1949 (component yards 1849 and 1906) | full-custom sailing & motor superyachts | active | joint venture of Royal Van Lent Shipyard & Koninklijke De Vries Scheepsbouw, with De Voogt Naval Architects | feadship.nl | "Feadship" = First Export Association of Dutch Shipbuilders, an umbrella brand, not a single yard |
| Benetti | Italy | Viareggio, Livorno, Fano | 1873 | custom & series-production superyachts | active | Azimut\|Benetti Group (Vitelli family) | azimutbenetti.com | 28 yachts in graph; bought by Paolo Vitelli/Azimut in 1985 |
| Oceanco | Netherlands | Alblasserdam | 1987 | full-custom megayachts, 80m+ | active | owned by Gabe Newell (since Aug 2025); previously Mohammed Al Barwani (2010–2025) | oceancoyacht.com | 22 yachts in graph |
| Sanlorenzo | Italy | Ameglia (La Spezia), plus Viareggio/Massa plants | 1958 | semi-custom motoryachts & superyachts | active | publicly listed, Borsa Italiana STAR (ticker SL); chaired by Massimo Perotti | sanlorenzoyacht.com | 15 yachts in graph |
| Sunseeker | UK | Poole, Dorset | 1969 (as Poole Power Boats; renamed 1985) | production sportscruisers & motoryachts | active | Lionheart Capital + Trojan Capital (since 2024) | sunseeker.com | 14 yachts in graph; previously Dalian Wanda Group (2013–2024) |
| Abeking & Rasmussen | Germany | Lemwerder | 1907 | custom yachts, SWATH/naval vessels, aluminium construction | active | privately held (Abeking/Rasmussen founding families) | abeking.com | 12 yachts in graph |
| Amels | Netherlands | Vlissingen | 1918 | semi-custom & custom superyachts | active | Damen Group (subsidiary since 1991) | amelsyachting.com | 11 yachts in graph |
| Damen Yachting | Netherlands | Vlissingen | division formed after 1991 Amels acquisition | semi-custom superyachts | active | Damen Shipyards Group | damenyachting.com | 4 yachts in graph; sister brand of Amels within Damen |
| Heesen | Netherlands | Oss | 1978 | fast aluminium & steel superyachts | active | privately held | heesenyachts.com | (curated from "Heesen Yachts" to match the existing graph node) 8 yachts in graph; founded by Frans Heesen |
| Gulf Craft | UAE | Ajman | 1982 | production motoryachts (Majesty Yachts, Nomad, Oryx lines) | active | privately held (Al Shaali family) | gulfcraftinc.com | 7 yachts in graph |
| Nobiskrug | Germany | Rendsburg | 1905 | custom steel megayachts | acquired by Lürssen (2024) after repeated insolvency | Lürssen (since 2024) | nobiskrug.com | 7 yachts in graph; built Sailing Yacht A |
| Golden Yachts | Greece | Perama (Piraeus) | 1996 | custom steel/aluminium superyachts & major refit | active | privately held | goldenyachts.gr | 7 yachts in graph |
| Turquoise Yachts | Turkey | Istanbul (Pendik) | 1997 merger (roots to 1970s Proteksan/Turquoise brands) | custom steel/aluminium superyachts | active | controlled by Mohammed Al Barwani (also owns Oceanco) since 2014 | turquoiseyachts.com | (curated from "Turquoise Yachts (Proteksan-Turquoise)" to match the existing graph node) 7 yachts in graph |
| Blohm + Voss | Germany | Hamburg | 1877 | megayacht refit/new-build, naval vessels | subsidiary of Lürssen since 2016; new-build yacht dept dissolved 2021; naval side now under Rheinmetall/NVL (2025) | Lürssen / NVL / Rheinmetall | nvl.de | 6 yachts in graph; built M/Y Eclipse |
| Overmarine | Italy | Viareggio | 1985 | open/sport motoryachts (Mangusta brand) | active | Balducci family | overmarinegroup.com | (curated from "Overmarine (Mangusta)" to match the existing graph node) 6 yachts in graph; duplicate graph node of "Overmarine Group" below — merged by graphCleanup.js |
| Delta Marine | USA | Seattle, WA | 1967 (incorporated 1970) | custom expedition & displacement superyachts | active | Jones family (founders' descendants) | deltamarine.com | 5 yachts in graph |
| CRN | Italy | Ancona | 1963 | custom steel/aluminium superyachts | active | Ferretti Group (since 1999) | crn-yacht.com | 4 yachts in graph; founded by Sanzio Nicolini; duplicate node of "CRN Yachts" below — merged by graphCleanup.js |
| CRN Yachts | Italy | Ancona | 1963 | custom steel/aluminium superyachts | active | Ferretti Group | crn-yacht.com | 4 yachts in graph; same company as "CRN" — dedup candidate, merged by graphCleanup.js |
| Princess | UK | Plymouth | 1965 (as Marine Projects (Plymouth) Ltd) | production flybridge/sport motoryachts | active | KPS Capital Partners (since Feb 2023) | princessyachts.com | (curated from "Princess Yachts" to match the existing graph node) 4 yachts in graph; previously LVMH/L Capital (2008–2023) |
| Rossinavi | Italy | Viareggio | 1980 (rebranded "Rossinavi" 2007) | full-custom steel/aluminium superyachts | active | family-owned (Rossi family — Claudio & Paride Rossi) | rossinavi.it | 4 yachts in graph |
| Admiral Yachts | Italy | Viareggio | brand of Overmarine Group (founded 1985) | custom steel/aluminium superyachts | active | Overmarine Group / Balducci family | admiral-yachts.com | 4 yachts in graph; sister brand to Mangusta; duplicate/overlap with "Admiral" (bare) node — merged by graphCleanup.js |
| Perini Navi | Italy | Viareggio & La Spezia | 1983 | custom sailing superyachts, furling systems pioneer | acquired by The Italian Sea Group (2021) after 2020 bankruptcy | The Italian Sea Group | perininavi.it | 4 yachts in graph; founded by Fabio Perini |
| Royal Huisman | Netherlands | Vollenhove | 1884 (yard est. 1884 in Ronduite; royal charter 1984) | custom sailing & motor superyachts | active | O2 Capital Partners (Dutch investor, since 2024) | royalhuisman.com | 4 yachts in graph |
| Westport Yachts | USA | Westport & Port Angeles, WA | 1964 | semi-custom production motoryachts | active | Chouest family (since 2014) | westportyachts.com | 4 yachts in graph |
| Bilgin Yachts | Turkey | Tuzla, Istanbul | 1929 | custom steel/aluminium superyachts | active | family-owned, 5th generation (Şengün family) | bilginyacht.com | 4 yachts in graph |
| Fincantieri | Italy | Trieste (yachts division at Genova/Ancona) | 1959 (Fincantieri Yachts division est. 2005) | megayachts, naval & commercial shipbuilding | active | majority state-owned via CDP Equity | fincantieriyachts.it | 4 yachts in graph; built M/Y Serene |
| Viareggio SuperYachts | Italy | Viareggio | 2004 | custom superyachts, 60–90m | active/uncertain (reports of ownership/investor changes ~2019) | privately held | — (no stable official site found) | (curated from "Viareggio SuperYachts (VSY)" to match the existing graph node, NOT the bare "Viareggio" suspect node) 4 yachts in graph; designer collaborations with Espen Øino |
| ISA | Italy | Ancona | 2001 | custom steel/aluminium superyachts | active | Palumbo Group (since 2016) | isayachts.com | 4 yachts in graph; ISA = "International Shipyards Ancona"; originally Rodriguez Group |
| Sunreef | Poland | Gdańsk (+ Ras Al Khaimah, UAE) | 2002 | luxury sailing & power catamarans | active | founded by Francis Lapp; privately held | sunreef-yachts.com | 4 yachts in graph |
| Austal | Australia | Henderson, WA | 1988 | aluminium catamarans/trimarans, naval & commercial vessels | active | publicly listed (ASX: ASB) | austal.com | 3 yachts in graph; world's largest aluminium shipbuilder |
| Palmer Johnson | USA / Netherlands | originally Sturgeon Bay, WI (closed 2015–2017); HQ now Monaco, yard in Netherlands | 1918 (as Johnson and Gmack) | sport & custom yachts | reduced/uncertain — US yard closed, relocated to Europe | privately held | pjpower.com | 3 yachts in graph |
| SilverYachts | Australia | Fremantle, WA | 2005 (as Hanseatic Marine) | high-speed all-aluminium megayachts | active | Chinese ownership (since ~2018) | silver-yachts.com | 3 yachts in graph; founded by Guido Krass |
| Codecasa | Italy | Viareggio | 1825 | custom steel/GRP motoryachts | active | Codecasa family (200 years as of 2025) | codecasayachts.com | 3 yachts in graph |
| Overmarine Group | Italy | Viareggio | 1985 | open/sport motoryachts (Mangusta, Admiral brands) | active | Balducci family | overmarinegroup.com | 3 yachts in graph; duplicate node of "Overmarine" above — kept as canonical by graphCleanup.js |
| Trinity Yachts | USA | New Orleans, LA / Gulfport, MS | 1988 (spun off from Halter Marine) | custom steel/aluminium superyachts | defunct (closed ~2016) | was Harvey Gulf International (2015) | — (site defunct) | 3 yachts in graph; founded by John Dane III |

## Other builders

| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Riva | Italy | Sarnico | 1842 | flybridge/open sport yachts (GRP) | active | Ferretti Group (since 2000) | riva-yacht.com | founded by Pietro Riva |
| Christensen | USA | Vancouver, WA (relocated to Tellico Lake, TN) | 1983 | custom tri-deck motoryachts | defunct/relocated (Vancouver yard closed 2015, final yacht 2019) | previously Henry Luken | — | (curated from "Christensen Shipyards" to match the existing graph node) |
| Alloy Yachts | New Zealand | Auckland | 1985 | custom aluminium sailing & motor yachts | defunct (wound down April 2016) | — | — | |
| Numarine | Turkey | Istanbul | 2002 | explorer motoryachts | active | founded by Ömer Malaz; privately held | numarine.com | |
| Wally | Monaco (built at Ferretti/Ancona) | Monaco | 1994 | carbon-fibre sailing & motor yachts | active | Ferretti Group (since 2019) | wally.com | founded by Luca Bassani |
| Hatteras | USA | New Bern, NC | 1959 | sportfish & motoryachts (early GRP pioneer) | active | White River Marine Group / Bass Pro Shops (since 2021) | hatterasyachts.com | (curated from "Hatteras Yachts" to match the existing graph node) previously Brunswick Corp (2001–2013), Versa Capital (2013–2021) |
| Ocean Alexander | Taiwan | Kaohsiung (+ USA facilities) | 1977 | production/semi-custom motoryachts | active | Chueh family | oceanalexander.com | |
| Ferretti | Italy | Forlì | 1968 | flybridge motoryachts | active | Ferretti Group, majority owned by Weichai Power (China) | ferrettigroup.com | (curated from "Ferretti (Ferretti Yachts)" to match the existing graph node) founded by Alessandro & Norberto Ferretti |
| Azimut | Italy | Avigliana | 1969 | production/semi-custom motoryachts | active | Azimut\|Benetti Group (Vitelli family) | azimutyachts.com | founded by Paolo Vitelli |
| Azimut Magellano | Italy | Avigliana / Savona | sub-line of Azimut | long-range explorer motoryachts | active | Azimut\|Benetti Group | azimutyachts.com | model/sub-brand of Azimut, not an independent builder |
| Beneteau | France | Saint-Gilles-Croix-de-Vie | 1884 | production sailboats & motorboats | active | publicly traded (Groupe Bénéteau) | beneteau.com | |
| Vard | Norway | Ålesund (+ Romania, Brazil, Vietnam) | roots early 1900s (renamed Vard 2013, ex-STX OSV) | offshore/expedition vessels, some explorer yachts | active | Fincantieri subsidiary (since 2012) | vard.com | |
| Damen | Netherlands | Gorinchem | 1927 | commercial/naval shipbuilding + yachts (via Amels/Damen Yachting) | active | family-owned (Damen family) | damen.com | parent of Amels/Damen Yachting; likely duplicate/overlap with "Damen Yachting" node — merged by graphCleanup.js |
| Icon Yachts | Netherlands | Harlingen | 2005 | explorer & conversion superyachts | active | owned by Micca Ferrero (since 2021) | iconyachts.nl | |
| Moonen | Netherlands | 's-Hertogenbosch | 1963 (as Scheepswerf de Ruiter; renamed Moonen 1981) | pocket superyachts, steel/aluminium | active | Baxter family (since 2019) | moonen.com | (curated from "Moonen Yachts" to match the existing graph node) |
| Devonport | UK | Plymouth | 1989 (yacht arm of Babcock/Devonport Dockyard, dockyard est. 1690) | megayacht refit/new-build | renamed/absorbed into Pendennis ("Pendennis Plus", 2010) | Pendennis Group | pendennis.com | (curated from "Devonport (Devonport Yachts)" to match the existing graph node) |
| Broward | USA | Fort Lauderdale, FL / Saugatuck, MI | 1948 | custom motoryachts | defunct as new-build (ceased ~2009); survives as refit yard "Broward Shipyard" | — | — | (curated from "Broward Marine" to match the existing graph node) founded by Frank Denison |
| Pearl | UK | Warwick (Stratford-upon-Avon origin) | 1998 | flybridge motoryachts | active | Whittaker family (since 2003) | pearlyachts.com | (curated from "Pearl Yachts" to match the existing graph node) |
| Freire Shipyard | Spain | Vigo | 1895 | commercial vessels & custom megayachts | active | Freire family (4th generation) | freireshipyard.com | |
| Vitters | Netherlands | Zwartsluis | 1990 | custom composite/aluminium sailing yachts | active | family-owned | vittersshipyard.com | (curated from "Vitters Shipyard" to match the existing graph node) |
| Baglietto | Italy | La Spezia (Varazze origin) | 1854 | custom steel/aluminium motoryachts | active | Gruppo Gavio (since 2012) | baglietto.com | |
| Columbus Yachts | Italy | Ancona | 2008 | custom motoryachts | active | Palumbo Group | columbusyachts.it | |
| Dunya Yachts | Turkey | Tuzla, Istanbul | 1985 (Ursa Shipyard roots 1983) | custom megayachts & refit | active | family-owned (Umut/Ergun families) | dunyayachts.com | built M/Y Axioma |
| Uljanik | Croatia | Pula | 1856 | commercial/naval shipbuilding | defunct/liquidated (bankrupt 2019–2020) | — | — | one of the oldest operating shipyards in the world before liquidation |
| Brodosplit | Croatia | Split | 1922 (current form 1932) | commercial shipbuilding | active | DIV Group (privatized 2013) | brodosplit.hr | largest shipyard in Croatia; canonical node for the "Brodograđevna Industrija Split" duplicate merged by graphCleanup.js |
| Lloyd Werft | Germany | Bremerhaven | 1863 | megayacht refit & conversion | active | part of Deutsche Yachten / NVL group | lloydwerft.com | |
| Elefsis | Greece | Elefsina | 1968 | commercial/naval shipbuilding | status uncertain | acquired by Neorion (1997) | — | (curated from "Elefsis Shipyards" to match the existing graph node) |
| Neorion | Greece | Syros (Ermoupolis) | 1861 | commercial/naval shipbuilding, some megayacht work | status uncertain | — | — | |
| Hellenic | Greece | Skaramangas, Athens | 1937 | naval/commercial shipbuilding | active (as Skaramangas Shipyards) | — | — | (curated from "Hellenic (Skaramangas Shipyards)" to match the existing graph node) formerly "Hellenic Shipyards S.A." |
| Vosper Thornycroft | UK | Portsmouth / Southampton (Woolston) | 1966 merger (Vosper 1871 + Thornycroft 1866) | naval vessels; historic yacht-adjacent builds | defunct as standalone brand (absorbed into VT Group/Babcock) | — | — | |
| Royal Denship | Denmark | multiple yards (Assens, Aalborg, Fredericia, etc.) | early 2000s | custom/expedition superyachts | defunct as original entity (bankrupt 2009); brand revived 2015 | Hartman Marine Group (Netherlands) | — | |
| Royal Niestern Sander | Netherlands | Delfzijl / Farmsum | 1901 | commercial vessels & custom yacht refit | active | — | niesternsander.com | |
| Clelands Shipbuilding Co | UK | Wallsend / Willington Quay | 1867/1872 | commercial vessels, some 1950s–60s luxury yacht builds | defunct (closed 1984) | was British Shipbuilders (nationalized 1977) | — | (curated from "Clelands Shipbuilding" to match the existing graph node, kept as canonical over the bare "Clelands" node graphCleanup.js merges away) |
| Palumbo | Italy | Naples (HQ) | 1967 | shipyard conglomerate (parent of ISA, Columbus, Mondomarine, Extra Yachts) | active | MSC holds 50% (since 2020) | palumbogroup.it | (curated from "Palumbo Group" to match the existing graph node) |
| Corsair Marine | originally USA (San Diego), now Vietnam (Ho Chi Minh City) | Ho Chi Minh City | 1984 | trailerable sailing trimarans | active | owned by Seawind Catamarans (since 2010) | corsairmarine.com | founded by John Walton; deliberately NOT curated onto the existing "Corsair Yachts" node — see Curation notes above |
| Crescent Custom Yachts | Canada | Richmond, BC (Crescent Beach origin) | 1985 | custom motoryachts | active (revived 2015 after 2004 closure) | Charles family | crescentyachts.ca | deliberately NOT curated onto the existing "Crescent Yachts" node — see Curation notes above |
| Kleven | Norway | Ulsteinvik | 1939 | commercial/offshore vessels, some expedition megayachts | part of Green Yard Group (since 2020) | Green Yard Group | — | (curated from "Kleven Verft" to match the existing graph node) |
| Pardo | Italy | Forlì | 1973 (Pardo motoryacht line launched 2016) | sport motoryachts & sailing yachts (Grand Soleil) | active | Ricci family / Oniverse | pardoyachts.com | (curated from "Pardo Yachts (Cantiere del Pardo)" to match the existing graph node) |

## Sources

See `research/round2/builder-enrichment.md`'s own Sources section for the
full per-builder citation list (Wikipedia, Boat International, builder/
shipyard own-site "About"/"History" pages, shipbuildinghistory.com, and
similar primary/near-primary sources).
