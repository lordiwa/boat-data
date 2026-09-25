# Builder Enrichment — Round 3, Lane J

Target: the 186 `builder` nodes in `ingest/data/graph.json` that currently have `"attrs": {}` (zero attributes). All 186 builder nodes in the graph are affected, so this file covers every builder that could be confirmed, prioritized by `built_by` edge count (yachts in the graph attributed to that builder).

Extraction method: since this subagent has no shell/Bash tool, node/edge counts were derived via `Grep` (exact-match on `"dst": "builder:<id>"`, which is unambiguous because the trailing quote anchors the JSON string) rather than the suggested `node -e` one-liner. Totals: 186 `builder` nodes, 563 `built_by` edges.

Builder = exact `name` field as it appears in the graph node (for the mapper to resolve by normalized name). Yacht counts (from `built_by` edges) are noted in parentheses in the Notes column for prioritization context — they are not part of the required schema but are left in for traceability.

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
| Heesen Yachts | Netherlands | Oss | 1978 | fast aluminium & steel superyachts | active | privately held | heesenyachts.com | 8 yachts in graph; founded by Frans Heesen |
| Gulf Craft | UAE | Ajman | 1982 | production motoryachts (Majesty Yachts, Nomad, Oryx lines) | active | privately held (Al Shaali family) | gulfcraftinc.com | 7 yachts in graph |
| Nobiskrug | Germany | Rendsburg | 1905 | custom steel megayachts | acquired by Lürssen (2024) after repeated insolvency | Lürssen (since 2024) | nobiskrug.com | 7 yachts in graph; built Sailing Yacht A |
| Golden Yachts | Greece | Perama (Piraeus) | 1996 | custom steel/aluminium superyachts & major refit | active | privately held | goldenyachts.gr | 7 yachts in graph |
| Turquoise Yachts (Proteksan-Turquoise) | Turkey | Istanbul (Pendik) | 1997 merger (roots to 1970s Proteksan/Turquoise brands) | custom steel/aluminium superyachts | active | controlled by Mohammed Al Barwani (also owns Oceanco) since 2014 | turquoiseyachts.com | 7 yachts in graph |
| Blohm + Voss | Germany | Hamburg | 1877 | megayacht refit/new-build, naval vessels | subsidiary of Lürssen since 2016; new-build yacht dept dissolved 2021; naval side now under Rheinmetall/NVL (2025) | Lürssen / NVL / Rheinmetall | nvl.de | 6 yachts in graph; built M/Y Eclipse |
| Overmarine (Mangusta) | Italy | Viareggio | 1985 | open/sport motoryachts (Mangusta brand) | active | Balducci family | overmarinegroup.com | 6 yachts in graph; duplicate graph node of "Overmarine Group" below |
| Delta Marine | USA | Seattle, WA | 1967 (incorporated 1970) | custom expedition & displacement superyachts | active | Jones family (founders' descendants) | deltamarine.com | 5 yachts in graph |
| CRN | Italy | Ancona | 1963 | custom steel/aluminium superyachts | active | Ferretti Group (since 1999) | crn-yacht.com | 4 yachts in graph; founded by Sanzio Nicolini; duplicate node of "CRN Yachts" below |
| CRN Yachts | Italy | Ancona | 1963 | custom steel/aluminium superyachts | active | Ferretti Group | crn-yacht.com | 4 yachts in graph; same company as "CRN" — likely duplicate node, dedup candidate |
| Princess Yachts | UK | Plymouth | 1965 (as Marine Projects (Plymouth) Ltd) | production flybridge/sport motoryachts | active | KPS Capital Partners (since Feb 2023) | princessyachts.com | 4 yachts in graph; previously LVMH/L Capital (2008–2023) |
| Rossinavi | Italy | Viareggio | 1980 (rebranded "Rossinavi" 2007) | full-custom steel/aluminium superyachts | active | family-owned (Rossi family — Claudio & Paride Rossi) | rossinavi.it | 4 yachts in graph |
| Admiral Yachts | Italy | Viareggio | brand of Overmarine Group (founded 1985) | custom steel/aluminium superyachts | active | Overmarine Group / Balducci family | admiral-yachts.com | 4 yachts in graph; sister brand to Mangusta; duplicate/overlap with "Admiral" (bare) node |
| Perini Navi | Italy | Viareggio & La Spezia | 1983 | custom sailing superyachts, furling systems pioneer | acquired by The Italian Sea Group (2021) after 2020 bankruptcy | The Italian Sea Group | perininavi.it | 4 yachts in graph; founded by Fabio Perini |
| Royal Huisman | Netherlands | Vollenhove | 1884 (yard est. 1884 in Ronduite; royal charter 1984) | custom sailing & motor superyachts | active | O2 Capital Partners (Dutch investor, since 2024) | royalhuisman.com | 4 yachts in graph |
| Westport Yachts | USA | Westport & Port Angeles, WA | 1964 | semi-custom production motoryachts | active | Chouest family (since 2014) | westportyachts.com | 4 yachts in graph |
| Bilgin Yachts | Turkey | Tuzla, Istanbul | 1929 | custom steel/aluminium superyachts | active | family-owned, 5th generation (Şengün family) | bilginyacht.com | 4 yachts in graph |
| Fincantieri | Italy | Trieste (yachts division at Genova/Ancona) | 1959 (Fincantieri Yachts division est. 2005) | megayachts, naval & commercial shipbuilding | active | majority state-owned via CDP Equity | fincantieriyachts.it | 4 yachts in graph; built M/Y Serene |
| Viareggio SuperYachts (VSY) | Italy | Viareggio | 2004 | custom superyachts, 60–90m | active/uncertain (reports of ownership/investor changes ~2019) | privately held | — (no stable official site found) | 4 yachts in graph; designer collaborations with Espen Øino |
| ISA | Italy | Ancona | 2001 | custom steel/aluminium superyachts | active | Palumbo Group (since 2016) | isayachts.com | 4 yachts in graph; ISA = "International Shipyards Ancona"; originally Rodriguez Group |
| Sunreef | Poland | Gdańsk (+ Ras Al Khaimah, UAE) | 2002 | luxury sailing & power catamarans | active | founded by Francis Lapp; privately held | sunreef-yachts.com | 4 yachts in graph |
| Austal | Australia | Henderson, WA | 1988 | aluminium catamarans/trimarans, naval & commercial vessels | active | publicly listed (ASX: ASB) | austal.com | 3 yachts in graph; world's largest aluminium shipbuilder |
| Palmer Johnson | USA / Netherlands | originally Sturgeon Bay, WI (closed 2015–2017); HQ now Monaco, yard in Netherlands | 1918 (as Johnson and Gmack) | sport & custom yachts | reduced/uncertain — US yard closed, relocated to Europe | privately held | pjpower.com | 3 yachts in graph |
| SilverYachts | Australia | Fremantle, WA | 2005 (as Hanseatic Marine) | high-speed all-aluminium megayachts | active | Chinese ownership (since ~2018) | silver-yachts.com | 3 yachts in graph; founded by Guido Krass |
| Codecasa | Italy | Viareggio | 1825 | custom steel/GRP motoryachts | active | Codecasa family (200 years as of 2025) | codecasayachts.com | 3 yachts in graph |
| Overmarine Group | Italy | Viareggio | 1985 | open/sport motoryachts (Mangusta, Admiral brands) | active | Balducci family | overmarinegroup.com | 3 yachts in graph; duplicate node of "Overmarine" above |
| Trinity Yachts | USA | New Orleans, LA / Gulfport, MS | 1988 (spun off from Halter Marine) | custom steel/aluminium superyachts | defunct (closed ~2016) | was Harvey Gulf International (2015) | — (site defunct) | 3 yachts in graph; founded by John Dane III |

## Other builders

| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Riva | Italy | Sarnico | 1842 | flybridge/open sport yachts (GRP) | active | Ferretti Group (since 2000) | riva-yacht.com | founded by Pietro Riva |
| Christensen Shipyards | USA | Vancouver, WA (relocated to Tellico Lake, TN) | 1983 | custom tri-deck motoryachts | defunct/relocated (Vancouver yard closed 2015, final yacht 2019) | previously Henry Luken | — | |
| Alloy Yachts | New Zealand | Auckland | 1985 | custom aluminium sailing & motor yachts | defunct (wound down April 2016) | — | — | |
| Numarine | Turkey | Istanbul | 2002 | explorer motoryachts | active | founded by Ömer Malaz; privately held | numarine.com | |
| Wally | Monaco (built at Ferretti/Ancona) | Monaco | 1994 | carbon-fibre sailing & motor yachts | active | Ferretti Group (since 2019) | wally.com | founded by Luca Bassani |
| Hatteras Yachts | USA | New Bern, NC | 1959 | sportfish & motoryachts (early GRP pioneer) | active | White River Marine Group / Bass Pro Shops (since 2021) | hatterasyachts.com | previously Brunswick Corp (2001–2013), Versa Capital (2013–2021) |
| Ocean Alexander | Taiwan | Kaohsiung (+ USA facilities) | 1977 | production/semi-custom motoryachts | active | Chueh family | oceanalexander.com | |
| Ferretti (Ferretti Yachts) | Italy | Forlì | 1968 | flybridge motoryachts | active | Ferretti Group, majority owned by Weichai Power (China) | ferrettigroup.com | founded by Alessandro & Norberto Ferretti |
| Azimut | Italy | Avigliana | 1969 | production/semi-custom motoryachts | active | Azimut\|Benetti Group (Vitelli family) | azimutyachts.com | founded by Paolo Vitelli |
| Azimut Magellano | Italy | Avigliana / Savona | sub-line of Azimut | long-range explorer motoryachts | active | Azimut\|Benetti Group | azimutyachts.com | model/sub-brand of Azimut, not an independent builder |
| Beneteau | France | Saint-Gilles-Croix-de-Vie | 1884 | production sailboats & motorboats | active | publicly traded (Groupe Bénéteau) | beneteau.com | |
| Vard | Norway | Ålesund (+ Romania, Brazil, Vietnam) | roots early 1900s (renamed Vard 2013, ex-STX OSV) | offshore/expedition vessels, some explorer yachts | active | Fincantieri subsidiary (since 2012) | vard.com | |
| Damen | Netherlands | Gorinchem | 1927 | commercial/naval shipbuilding + yachts (via Amels/Damen Yachting) | active | family-owned (Damen family) | damen.com | parent of Amels/Damen Yachting; likely duplicate/overlap with "Damen Yachting" node |
| Icon Yachts | Netherlands | Harlingen | 2005 | explorer & conversion superyachts | active | owned by Micca Ferrero (since 2021) | iconyachts.nl | |
| Moonen Yachts | Netherlands | 's-Hertogenbosch | 1963 (as Scheepswerf de Ruiter; renamed Moonen 1981) | pocket superyachts, steel/aluminium | active | Baxter family (since 2019) | moonen.com | |
| Devonport (Devonport Yachts) | UK | Plymouth | 1989 (yacht arm of Babcock/Devonport Dockyard, dockyard est. 1690) | megayacht refit/new-build | renamed/absorbed into Pendennis ("Pendennis Plus", 2010) | Pendennis Group | pendennis.com | |
| Broward Marine | USA | Fort Lauderdale, FL / Saugatuck, MI | 1948 | custom motoryachts | defunct as new-build (ceased ~2009); survives as refit yard "Broward Shipyard" | — | — | founded by Frank Denison |
| Pearl Yachts | UK | Warwick (Stratford-upon-Avon origin) | 1998 | flybridge motoryachts | active | Whittaker family (since 2003) | pearlyachts.com | |
| Freire Shipyard | Spain | Vigo | 1895 | commercial vessels & custom megayachts | active | Freire family (4th generation) | freireshipyard.com | |
| Vitters Shipyard | Netherlands | Zwartsluis | 1990 | custom composite/aluminium sailing yachts | active | family-owned | vittersshipyard.com | |
| Baglietto | Italy | La Spezia (Varazze origin) | 1854 | custom steel/aluminium motoryachts | active | Gruppo Gavio (since 2012) | baglietto.com | |
| Columbus Yachts | Italy | Ancona | 2008 | custom motoryachts | active | Palumbo Group | columbusyachts.it | |
| Dunya Yachts | Turkey | Tuzla, Istanbul | 1985 (Ursa Shipyard roots 1983) | custom megayachts & refit | active | family-owned (Umut/Ergun families) | dunyayachts.com | built M/Y Axioma |
| Uljanik | Croatia | Pula | 1856 | commercial/naval shipbuilding | defunct/liquidated (bankrupt 2019–2020) | — | — | one of the oldest operating shipyards in the world before liquidation |
| Brodosplit | Croatia | Split | 1922 (current form 1932) | commercial shipbuilding | active | DIV Group (privatized 2013) | brodosplit.hr | largest shipyard in Croatia |
| Lloyd Werft | Germany | Bremerhaven | 1863 | megayacht refit & conversion | active | part of Deutsche Yachten / NVL group | lloydwerft.com | |
| Elefsis Shipyards | Greece | Elefsina | 1968 | commercial/naval shipbuilding | status uncertain | acquired by Neorion (1997) | — | |
| Neorion | Greece | Syros (Ermoupolis) | 1861 | commercial/naval shipbuilding, some megayacht work | status uncertain | — | — | |
| Hellenic (Skaramangas Shipyards) | Greece | Skaramangas, Athens | 1937 | naval/commercial shipbuilding | active (as Skaramangas Shipyards) | — | — | formerly "Hellenic Shipyards S.A." |
| Vosper Thornycroft | UK | Portsmouth / Southampton (Woolston) | 1966 merger (Vosper 1871 + Thornycroft 1866) | naval vessels; historic yacht-adjacent builds | defunct as standalone brand (absorbed into VT Group/Babcock) | — | — | |
| Royal Denship | Denmark | multiple yards (Assens, Aalborg, Fredericia, etc.) | early 2000s | custom/expedition superyachts | defunct as original entity (bankrupt 2009); brand revived 2015 | Hartman Marine Group (Netherlands) | — | |
| Royal Niestern Sander | Netherlands | Delfzijl / Farmsum | 1901 | commercial vessels & custom yacht refit | active | — | niesternsander.com | |
| Clelands Shipbuilding | UK | Wallsend / Willington Quay | 1867/1872 | commercial vessels, some 1950s–60s luxury yacht builds | defunct (closed 1984) | was British Shipbuilders (nationalized 1977) | — | |
| Palumbo Group | Italy | Naples (HQ) | 1967 | shipyard conglomerate (parent of ISA, Columbus, Mondomarine, Extra Yachts) | active | MSC holds 50% (since 2020) | palumbogroup.it | |
| Corsair Marine | originally USA (San Diego), now Vietnam (Ho Chi Minh City) | Ho Chi Minh City | 1984 | trailerable sailing trimarans | active | owned by Seawind Catamarans (since 2010) | corsairmarine.com | founded by John Walton |
| Crescent Custom Yachts | Canada | Richmond, BC (Crescent Beach origin) | 1985 | custom motoryachts | active (revived 2015 after 2004 closure) | Charles family | crescentyachts.ca | |
| Kleven Verft | Norway | Ulsteinvik | 1939 | commercial/offshore vessels, some expedition megayachts | part of Green Yard Group (since 2020) | Green Yard Group | — | |
| Pardo Yachts (Cantiere del Pardo) | Italy | Forlì | 1973 (Pardo motoryacht line launched 2016) | sport motoryachts & sailing yachts (Grand Soleil) | active | Ricci family / Oniverse | pardoyachts.com | |

## Suspect nodes

These graph nodes look like ingestion artifacts, mislabeled entity types, or duplicates rather than genuine independent shipbuilders. They were **not** researched as builders; flagging for cleanup instead.

- **Y.CO** (`builder:y-co`) — Y.CO is a yacht **management, brokerage and charter** company, not a shipyard. Mislabeled entity type; has 3 `built_by` edges in the graph, which is itself a data-quality signal (yachts are probably being attributed to their management company instead of their actual builder).
- **Hoek Design** (`builder:hoek-design`) — a **naval architecture / design studio** (Hoek Design Naval Architects), not a shipbuilder. The actual builder (e.g., Royal Huisman, Vitters) should carry the `built_by` edge.
- **Philip Zepter** (`builder:philip-zepter`) — a person's name (likely a yacht owner), not a shipyard. Probable owner/builder field confusion during ingestion.
- **Custom** (`builder:custom`), **Custom (rebuild)** (`builder:custom-rebuild`), **Various** (`builder:various`), **Mixed** (`builder:mixed`) — generic catch-all placeholder values used when the source text didn't name a specific yard. Not real companies; cannot be enriched with country/founded/etc. High edge counts (Custom = 70, Various = 38) suggest a lot of source records lack a specific builder attribution.
- **Motorsailer** (`builder:motorsailer`) — a hull/rig configuration type, not a builder name.
- **Sportiva 55** (`builder:sportiva-55`) — reads like a yacht/model name, not a shipyard name.
- **Arcadia Sherpa** (`builder:arcadia-sherpa`) — "Sherpa" is a model line of Arcadia Yachts; this looks like a model name captured as a separate builder node instead of being merged into "Arcadia".
- **Winch Design/Vard** (`builder:winch-design-vard`) — combines an interior-design studio (Winch Design) and a shipyard (Vard) into a single malformed node; these are two different entities/roles.
- **Cies - Oassive** (`builder:cies-oassive`) — garbled/unparseable string, likely an OCR or scraping fragment from the source corpus.
- **Kolotura** (`builder:kolotura`) — could not confirm as a real shipyard via web search; possibly a mangled term or yacht name. Left unconfirmed rather than guessed.
- **Viareggio** (`builder:viareggio`, bare) — likely refers to the Italian shipbuilding town itself rather than naming a specific company (distinct from the real company "Viareggio SuperYachts").
- **Bali Catamarans** (`builder:bali-catamarans`) — "BALI" is a model line of Catana Group, not an independent shipyard.
- **Brodograđevna Industrija Split** (`builder:brodogra-evna-industrija-split`) — the id slug lost the "đ" character during slugification; more importantly, this literally translates to "Shipbuilding Industry Split" and is almost certainly the same historical entity as **Brodosplit** under an earlier/formal name — probable duplicate.
- **Helsingør** (`builder:helsing-r`) — the id slug appears to have mis-transliterated "ø" ("helsing-r"); this is very likely the same yard as **Helsingor Vaerft** (`builder:helsingor-vaerft`) under two different node ids — probable duplicate.

**Likely duplicate-entity pairs** (same real company, two separate graph nodes — not malformed content, but a dedup opportunity for the graph):
CRN / CRN Yachts · Admiral / Admiral Yachts · Abeking / Abeking & Rasmussen · Trinity / Trinity Yachts · ISA / ISA Yachts · Damen / Damen Yachting · Austal / Austal Ships · Icon / Icon Yachts · Bilgin / Bilgin Yachts · Overmarine / Overmarine Group · Freire / Freire Shipyard · Clelands / Clelands Shipbuilding Co · Dunya / Dunya Yachts · Grandi Yatcilik / Grandi Yatcilik Mimarlik · Olympic / Olympic Yacht / Olympic Yacht Services.

## Sources

- [Lürssen — About/History](https://www.lurssen.com/en/about/history/), [Lürssen — Wikipedia](https://en.wikipedia.org/wiki/L%C3%BCrssen)
- [Feadship — Wikipedia](https://en.wikipedia.org/wiki/Feadship), [Feadship History](https://feadship.nl/history)
- [Benetti — Wikipedia](https://en.wikipedia.org/wiki/Benetti), [Azimut|Benetti Group — About](https://www.azimutbenetti.com/about-us/)
- [Oceanco — Wikipedia](https://en.wikipedia.org/wiki/Oceanco)
- [Sanlorenzo S.p.a. — Wikipedia](https://en.wikipedia.org/wiki/Sanlorenzo_S.p.a.)
- [Sunseeker — Wikipedia](https://en.wikipedia.org/wiki/Sunseeker)
- [Abeking & Rasmussen — Wikipedia](https://en.wikipedia.org/wiki/Abeking_&_Rasmussen)
- [Amels/Damen — Aberton Yachts](https://abertonyachts.com/shipyards/amelsdamen/), [Damen Yachting — Our Story](https://www.damenyachting.com/about/our-story)
- [Heesen Yachts — Wikipedia](https://en.wikipedia.org/wiki/Heesen_Yachts)
- [Gulf Craft — Boat International](https://www.boatinternational.com/profiles/gulf-craft--17423)
- [Nobiskrug — Wikipedia](https://en.wikipedia.org/wiki/Nobiskrug)
- [Golden Yachts — Story](https://www.goldenyachts.gr/story/)
- [Turquoise Yachts — Heritage](https://www.yachtbuyer.com/en-gb/turquoise/heritage)
- [Blohm+Voss — Wikipedia](https://en.wikipedia.org/wiki/Blohm+Voss)
- [Overmarine Group / Mangusta — Yachts International](https://yachtsinternational.com/shipyard-showcase/overmarine-group-mangusta/)
- [Delta Marine — Story](https://www.deltamarine.com/story/)
- [CRN — Inwards Marine History](https://www.inwardsmarine.com/new-yachts/crn/crn-history)
- [Princess Yachts — Wikipedia](https://en.wikipedia.org/wiki/Princess_Yachts)
- [Rossinavi — Wikipedia](https://en.wikipedia.org/wiki/Rossinavi)
- [Perini Navi — Wikipedia](https://en.wikipedia.org/wiki/Perini_Navi), [Megayacht News — Italian Sea Group acquires Perini Navi](https://megayachtnews.com/2021/12/the-italian-sea-group-has-acquired-perini-navi/)
- [Royal Huisman — Wikipedia](https://en.wikipedia.org/wiki/Royal_Huisman)
- [Westport Yachts — shipbuildinghistory.com](http://shipbuildinghistory.com/shipyards/yachtlarge/westport.htm)
- [Bilgin Yacht — Heritage](https://bilginyacht.com/EN/heritage)
- [Fincantieri — Wikipedia](https://en.wikipedia.org/wiki/Fincantieri)
- [Viareggio SuperYachts — Boat International](https://www.boatinternational.com/profiles/viareggio-superyachts--17281)
- [ISA Yachts / Palumbo — The Islander](https://theislander.online/2016/07/c83-news/palumbo-wins-bid-for-isa-yachts/)
- [Sunreef Yachts — History](https://sunreef-yachts.com/en/about-us/history/)
- [Austal — Wikipedia](https://en.wikipedia.org/wiki/Austal)
- [Palmer Johnson — Our History](https://www.pjpower.com/history), [Megayacht News — PJ leaving USA](https://megayachtnews.com/2015/09/palmer-johnson-leaving-usa-opening-dutch-yard/)
- [SilverYachts — Boat International](https://www.boatinternational.com/profiles/silveryachts--17661)
- [Codecasa — Our History](https://www.codecasayachts.com/en/our-history/)
- [Trinity Yachts — shipbuildinghistory.com](http://shipbuildinghistory.com/shipyards/yachtlarge/trinityyachts.htm)
- [Riva — Wikipedia via search summary](https://en.wikipedia.org/wiki/Ferretti_Group)
- [Christensen Shipyards — Wikipedia](https://en.wikipedia.org/wiki/Christensen_Shipyards)
- [Alloy Yachts — SuperyachtNews](https://www.superyachtnews.com/business/farewell-to-a-kiwi-boatbuilder)
- [Numarine — Heritage](https://numarine.com/nus-heritage)
- [Wally Yachts — Wikipedia](https://en.wikipedia.org/wiki/Wally_Yachts)
- [Hatteras Yachts — Our Story](https://www.hatterasyachts.com/our-story.html)
- [Ocean Alexander — Wikipedia](https://en.wikipedia.org/wiki/Ocean_Alexander)
- [Ferretti Group — Our History](https://www.ferrettigroup.com/en-us/Corporate/Our-history)
- [Azimut Yachts — Wikipedia](https://en.wikipedia.org/wiki/Azimut_Yachts)
- [Beneteau — Wikipedia](https://en.wikipedia.org/wiki/Beneteau)
- [Vard — About Us](https://www.vard.com/about-us)
- [Damen Group — Wikipedia](https://en.wikipedia.org/wiki/Damen_Group)
- [ICON Yachts — Wikipedia](https://en.wikipedia.org/wiki/ICON_Yachts)
- [Moonen Yachts — Our Story](https://moonen.com/our-story/)
- [HMNB Devonport — Wikipedia](https://en.wikipedia.org/wiki/HMNB_Devonport)
- [Broward Marine — shipbuildinghistory.com](http://shipbuildinghistory.com/shipyards/yachtlarge/broward.htm)
- [Pearl Yachts — Heritage](https://www.pearlyachts.com/heritage/)
- [Freire Shipyard — History](https://freireshipyard.com/en/history/)
- [Vitters Shipyard — Wikipedia](https://en.wikipedia.org/wiki/Vitters_Shipyard)
- [Baglietto — Wikipedia](https://en.wikipedia.org/wiki/Baglietto)
- [Columbus Yachts / Palumbo — Worth Avenue Yachts](https://www.worthavenueyachts.com/07-01-2019/the-palumbo-group/)
- [Dunya Yachts — About Us](https://www.dunyayachts.com/about-us)
- [Uljanik — Wikipedia](https://en.wikipedia.org/wiki/Uljanik)
- [Brodosplit — Wikipedia](https://en.wikipedia.org/wiki/Brodosplit)
- [Lloyd Werft — Wikipedia](https://en.wikipedia.org/wiki/Lloyd_Werft)
- [Skaramangas Shipyards — Wikipedia](https://en.wikipedia.org/wiki/Skaramangas_Shipyards), [Neorion — Wikipedia](https://en.wikipedia.org/wiki/Neorion), [Elefsis Shipyards — Wikipedia](https://en.wikipedia.org/wiki/Elefsis_Shipyards)
- [Vosper & Company — Wikipedia](https://en.wikipedia.org/wiki/Vosper_&_Company), [John I. Thornycroft & Company — Wikipedia](https://en.wikipedia.org/wiki/John_I._Thornycroft_&_Company)
- [Royal Denship — Wikipedia](https://en.wikipedia.org/wiki/Royal_Denship)
- [Royal Niestern Sander — About Us](https://www.niesternsander.com/about-us)
- [Clelands Shipbuilding Company — Wikipedia](https://en.wikipedia.org/wiki/Clelands_Shipbuilding_Company)
- [Palumbo Shipyards — Wikipedia](https://en.wikipedia.org/wiki/Palumbo_Shipyards)
- [Corsair Marine — History](https://corsairmarine.com/history/)
- [Crescent Custom Yachts — About Us](https://www.crescentyachts.ca/about-us/)
- [Kleven Verft — Wikipedia (DE)](https://de.wikipedia.org/wiki/Kleven_Verft), [Kleven Group — Wikipedia](https://en.wikipedia.org/wiki/Kleven_Group)
- [Cantiere del Pardo — Our Heritage](https://cantieredelpardo.com/company/our-heritage/)

## Coverage notes

- **Builders covered with confirmed facts:** 37 major-tier (3+ yachts) + 38 other-tier = 75 of 186 builder nodes, plus 13 flagged as suspect/non-builder nodes and ~15 flagged as likely duplicate-entity pairs.
- **Not covered (long tail, mostly 1-yacht attributions):** roughly 95 remaining builder nodes were left unresearched rather than guessed at. These are disproportionately: (a) small/regional yards with only one yacht in the graph and thin English-language web presence (e.g., Pak Haji Saka, Bahtera Bahari — Indonesian traditional phinisi builders; Lamda Nafs Shipyards, Odisej — Greek/Croatian small yards; Yachtley, Shear Yachts, Warren Yachts), (b) defunct mid-century commercial/military yards referenced only for a single vintage refit (Samuda Bros, Canadian Vickers, Lloyds Ships, Schichau Unterweser, Elsflether Werft, Bremer Vulkan, Cassens-Werft, Peters Schiffbau, SFCN, Flender, Jeff Boat, Hudson, Pacific Motor Boat, Newcastle Marine), and (c) small Turkish/Italian/Dutch series builders where I could not find a reliable primary source in the time available (Tansu, Ares Yachts, AK Yacht/Akyacht, Mayra Yachts, FX Yachts, Grandi Yatcilik, Mariotti, CCN, Mondomarine, Cantieri di Pisa, Cantiere delle Marche, Picchiotti, Platinum Marine/Yachts, Lazzara, Circa Marine, Custom Line, Amer, Absolute, Kusch Yachts, Derecktor, Inace, Hakvoort, Van der Graaf, Scheepswerf Gebr. van der Werf, Vuyk en Zonen, Vuijk Scheepswerven, Yachtsourcing, Radez, Bayaco, Australian Yacht Builders, Rauma, Piriou, Astilleros Armon, ADM Shipyards, Alstom, Neel, Rayburn, Intermarine USA, Dreamline Yachts, Profab Engineering, Xplorer, Stainless Structures, Ditmar Donaldson, Northstar Yachts, Halter Marine, Mangusta as a standalone node, Olympic/Olympic Yacht/Olympic Yacht Services).
- None of these were guessed at — per instructions, accuracy was prioritized over completeness, and it is acceptable to leave low-priority/obscure builders uncovered for a follow-up research pass if the team wants deeper coverage.
