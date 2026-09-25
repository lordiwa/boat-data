# Person Enrichment — Round 5, Lane N

Scope: 110 `person` nodes in `ingest/data/graph.json` (110/110 covered below).
Methodology: knowledge-base lookup (none found — `knowledge/entries/` and
`knowledge/graph/` do not exist in this repo yet, so no KB hits), corpus
cross-check against `/knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md`,
`/knowledge/13_...Celebrity_Yachts...md`, `/knowledge/15_...Billionaire...md`,
and targeted web research for names/claims the corpus did not corroborate or
that looked suspicious. All 110 graph names are listed verbatim below (many
are **not** independent people — see Coverage notes).

## Persons

| Person | Nationality | Industry | Role/Title | Status | Ownership Confidence | Notes |
|---|---|---|---|---|---|---|
| Abdulla Al Futtaim | UAE (Emirati) | Retail/automotive — Al‑Futtaim Group | Owner, Al‑Futtaim Group | Living | Confirmed | Owns Radiant (ex‑Darius, 110m Lürssen 2009), commissioned by Boris Berezovsky to rival Abramovich's Pelorus. |
| Alexander Mikheev | Russian | Defense/arms export (Rosoboronexport) | CEO, Rosoboronexport | Living (US/EU sanctioned) | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Lady Anastasia (157ft), detained Mallorca Mar 2022; crew member tried to scuttle it in protest. |
| Alexei Mordashov | Russian | Steel (Severstal) | Chairman, Severstal | Living (EU sanctioned) | Confirmed (Nord not seized) / Confirmed (Lady M seized) | Owns Nord (465ft, sailed to Vladivostok pre‑sanctions); previously owned Lady M, seized in Imperia, Italy, Mar 2022. |
| Alisher Usmanov | Russian/Uzbek | Metals/mining/telecom (Metalloinvest, USM) | Founder, USM Holdings | Living (US/EU sanctioned) | Widely reported (beneficial owner) | Dilbar (156m Lürssen, largest by GT) immobilized in Hamburg since Mar 2022; legal title held by sister Gulbahor Ismailova. |
| Alisher Usmanov (legally owned by sister Gulbahor Ismailova) | — duplicate node — | — | — | — | — | Variant of the same person/ownership-structure node above; not a distinct individual. |
| Alisher Usmanov (via sister) | — duplicate node — | — | — | — | — | Same as above. |
| Alisher Usmanov (via sister Gulbahor Ismailova) | — duplicate node — | — | — | — | — | Same as above. |
| Andrey Guryev | Russian | Fertilizer (PhosAgro) | Former Chairman, PhosAgro | Living (US sanctioned) | Confirmed | Alfa Nero (266ft) seized Antigua & Barbuda 2022, sold privately July 2024 for ~$40M after a failed 2023 auction. |
| Andrey Melnichenko | Russian (renounced citizenship) | Fertilizer/coal (EuroChem, SUEK) | Founder | Living (EU sanctioned) | Confirmed (both seized) | Owns "A" (Blohm+Voss, 119m) and Sailing Yacht A (469ft, world's largest sailing yacht); both seized Trieste, Italy, Mar 2022. |
| Ann Walton Kroenke | American | Retail/inherited wealth (Walmart, Walton family) | Heiress; wife of Stan Kroenke | Living | Confirmed | Owns Aquila. |
| Bahrain Royal | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Linked to Al Salamah (139m Lürssen, 1999); no single named owner confirmed. |
| Barry Zekelman | Canadian | Steel/manufacturing (Zekelman Industries) | Executive Chairman | Living | Confirmed | Owns Man of Steel (ex‑Seven Seas, Steven Spielberg's former Oceanco yacht, bought Oct 2021, $150M); has owned multiple yachts all named "Man of Steel" (incl. two Heesens) — likely source of the separate "Z" graph node. |
| Bernard Arnault | French | Luxury goods (LVMH) | Chairman/CEO, LVMH | Living | Confirmed | Owns Symphony (101.5m Feadship). |
| Bilal Hydrie | Pakistani‑Canadian | Petroleum/entrepreneurship (Pennine Petroleum) | Businessman | Living | **Contradicted** | Web search attributes Tatiana (80m Bilgin, 2021) to **Shapoor Mistry** (Indian, Shapoorji Pallonji Group), not Hydrie. Likely a misattribution inherited from the source corpus — flag for correction. |
| Bill Gates | American | Tech (Microsoft co‑founder), philanthropy | Co‑founder, Microsoft; Gates Foundation | Living | Widely reported | Linked to Breakthrough (Feadship) and Wayfinder; also historically linked to leasing Serene from MBS (2014). Purchase/charter details vary by source — treat length/price specifics as unverified color. |
| Bill Gates (support vessel) | — duplicate/placeholder node — | — | — | — | — | Represents the Wayfinder support-vessel relationship, not a distinct person. |
| Dan Snyder (rumored) | American | Media/sports (ex‑Washington Commanders NFL owner) | Former NFL team owner | Living | **Rumored only** (graph itself flags this) | Lady S ownership not corroborated independently this session. |
| David Geffen | American | Entertainment (DreamWorks, Geffen Records) | Media mogul | Living | Confirmed | Sole owner of Rising Sun (453ft Lürssen) since 2010 buyout of co‑owner Larry Ellison. |
| Dmitry Kamenshchik | Russian | Aviation infrastructure (Domodedovo Airport) | Owner/Chairman | Living | Widely reported | Linked to Flying Fox (136m Lürssen); ownership has been described as unclear/disputed in some reporting. |
| Dmitry Pumpyansky | Russian | Steel pipe manufacturing (TMK/Sinara) | Founder | Living (EU sanctioned) | Confirmed | Axioma (240ft) seized by JPMorgan (mortgage rights) in Gibraltar, Mar 2022; sold at auction 2023 for $37.5M. |
| Dubai Royal (Mohammed bin Rashid Al Maktoum) | — duplicate node — | n/a | Ruler of Dubai / UAE PM & VP | Living | Confirmed | Same real person as "Sheikh Mohammed" and "Sheikh Mohammed bin Rashid Al Maktoum" below — three graph nodes, one individual. Owns Dubai (162m). |
| Eduard Khudaynatov | Russian | Oil (ex‑Rosneft president; Independent Petroleum Company) | Businessman | Living (US/EU sanctioned) | Widely reported (disputed) | Claimed owner of Scheherazade (140m Lürssen); ownership publicly contested/litigated, also claimed as owner of Amadea. |
| Egyptian Presidential Yacht | — not an individual — | n/a | Institutional (Egyptian state) | n/a | N/A | El Mahrousa (1865, historic state yacht). |
| Eike Batista (previous) | Brazilian | Mining/oil (EBX Group) | Entrepreneur (convicted, corruption case) | Living | **Unconfirmed** | H3 (105.26m Oceanco) ownership not corroborated — public sources instead cite Qatar's former PM, Vijay Mallya, and the Saudi Royal Family as prior owners. |
| Eike Batista (previously) | — duplicate node — | — | — | — | — | Same as above. |
| Eric Smidt | American | Retail/tools (Harbor Freight Tools) | Chairman/CEO | Living | Confirmed | Owns Infinity (117m Oceanco, ~$300M). |
| Estate of Paul Allen (now Roger Samuelsson) | — ownership-chain node — | n/a | n/a | Paul Allen deceased (2018) | Confirmed | Octopus (126m Lürssen) sold by the Allen estate to Roger Samuelsson (~2022). |
| Faisal Al Ayyar | Kuwaiti | Finance/investment (KIPCO, retired Vice‑Chairman) | Former Vice‑Chairman, KIPCO | Living | **Unconfirmed** | No public source found linking Al Ayyar to a yacht named Elements. |
| Farkhad Akhmedov | Russian/Azerbaijani | Oil & gas (Northgas) | Businessman, former senator | Living | Confirmed | Owns Luna (115m Lloyd Werft, ex‑Abramovich); subject of UK's largest-ever divorce settlement case (Akhmedov v Akhmedova). |
| Frank Fertitta | American | Gaming/casinos (Station Casinos); UFC co‑founder | Chairman, Station Casinos | Living | Confirmed (**former** owner) | Owned Viva (94m Feadship, $175–250M) — **sold to Ken Griffin (Citadel) in August 2024**; graph should be updated to reflect current owner. |
| Gennady Timchenko | Russian | Energy (Novatek, Volga Group) | Businessman | Living (US/EU sanctioned) | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Lena (132ft), seized San Remo, Italy, Mar 2022. |
| Graeme Hart | New Zealander | Manufacturing/packaging (Rank Group, Reynolds Group) | Owner | Living (NZ's richest person) | Confirmed | Owns Multiverse (116m Kleven). |
| Guido Krass | German | Investment (Pari Group); founder, Silver Yachts | Entrepreneur | Living | Confirmed | Owns Bold (85.3m Silver Yachts, delivered 2019, $100M). |
| Herb Chambers | American | Automotive retail (Herb Chambers Companies, 60 dealerships) | Founder | Living | Confirmed | Owns Excellence (80m Abeking & Rasmussen, "Excellence VI" in a long line of same-named yachts). |
| Igor Sechin | Russian | Oil (Rosneft) | CEO, Rosneft | Living (US/EU sanctioned) | Confirmed | Owns Crescent (135.5m, seized Spain Mar 2022); also linked to Amore Vero (seized France) per corpus. |
| Indonesian corporate | — not an individual — | n/a | Corporate/anonymous entity | n/a | N/A | Linked to J7 Explorer (120m). |
| Jack Ma (rumored) | Chinese | Tech/e‑commerce (Alibaba co‑founder) | Retired executive, low public profile since 2020 | Living | **Rumored only** (graph itself flags this) | Zen ownership not corroborated in mainstream press this session. |
| James Packer | Australian | Gaming/media (Crown Resorts, Consolidated Press) | Former Executive Chairman, Crown Resorts | Living | Confirmed | Owns IJE (354ft Benetti, named for his children Indigo/Jackson/Emmanuelle). |
| Jeff Bezos | American | Tech/e‑commerce (Amazon); aerospace (Blue Origin) | Founder/Executive Chairman, Amazon | Living | Confirmed | Owns Koru (127m Oceanco sailing yacht) + support vessel Abeona. |
| Jeff Bezos (rumored) | — duplicate/likely-erroneous node — | — | — | — | Rumored only | Linked in graph to Flying Fox, which is separately (and more credibly) linked to Dmitry Kamenshchik — flag as a probable data conflation. |
| JK Rowling | British | Literature (Harry Potter author) | Author | Living | Widely reported | Linked to Samsara (ex‑Amphitrite); some reporting frames this as part of a billionaire ownership lineage rather than sole personal ownership. |
| John Christodoulou | British‑Cypriot | Real estate (Yianis Group) | Property billionaire | Living | Widely reported | Linked to Zeus; not independently re-verified via fresh web search this session (consistent across corpus/aggregator sources). |
| John Symond | Australian | Finance (Aussie Home Loans, founder) | Founder | Living | Confirmed (**former** owner) | Took delivery of Hasna (73m Feadship) in 2017 for $150M+; **sold ~2020**, yacht renamed Lunasea. |
| Kjell Inge Røkke | Norwegian | Fishing/maritime/industrial (Aker ASA) | Founder/majority owner, Aker | Living | Confirmed | Owns/commissioned REV Ocean (research + expedition megayacht project). |
| Lakshmi Mittal | Indian (UK‑based) | Steel (ArcelorMittal) | Chairman/CEO | Living | Confirmed | Owns Amevi. |
| Larry Ellison | American | Tech (Oracle co‑founder) | Chairman/CTO, Oracle | Living | Confirmed | Owns Musashi (88m Feadship); previously co‑owned Rising Sun with David Geffen until 2010. |
| Laurene Powell Jobs | American | Philanthropy/investment (Emerson Collective); widow of Steve Jobs | Founder/President, Emerson Collective | Living | Confirmed | Owns Venus (Steve Jobs commissioned it; inherited/retained by Powell Jobs after his 2011 death). |
| Laurene Powell Jobs (Steve Jobs family) | — duplicate node — | — | — | — | — | Same as above. |
| Liu Qiangdong | Chinese | E‑commerce (JD.com) | Chairman, JD.com | Living | Widely reported (opaque) | Linked to Golden Odyssey (123.2m); Chinese billionaire yacht ownership is typically not officially confirmed by the individual — treat as press-reported, not self‑disclosed. |
| Liu Qiangdong (JD.com) | — duplicate node — | — | — | — | Widely reported (opaque) | Same person, linked instead to Deep Blue (134.2m, 2025) — same confidence caveat as above. |
| Mark Zuckerberg | American | Tech/social media (Meta/Facebook founder) | Founder/CEO, Meta | Living | Confirmed | Owns Launchpad (118–119m Feadship). Corpus color claiming "no broker, no boat show, direct builder sale" was not independently re-verified this session — treat as plausible but unconfirmed detail. |
| Michael Lee-Chin | Canadian‑Jamaican | Finance/investment (Portland Holdings, AIC Limited) | Chairman/CEO | Living | Confirmed (**former** owner) | Took delivery of Ahpo (115.1m Lürssen, "Project Enzo") in 2021, ~$354M — **sold in 2023 to Patrick Dovigi**, who renamed it Lady Jorgia. Graph currently double-counts this single vessel as two yachts under two owners; both entries are correct as of their respective ownership periods. |
| Mixed (e.g., more Lürssen/Feadship) | — not an individual — | n/a | Aggregate placeholder | n/a | N/A | Represents "Various 110–112m" filler yachts in a top‑50 list; not a real owner. |
| Mohammed bin Salman | Saudi | n/a (head of government) | Crown Prince & Prime Minister, Saudi Arabia | Living | Confirmed | Owns Serene (134m Fincantieri), leased to Bill Gates in 2014 before MBS's purchase. |
| Mohammed bin Zayed Al Nahyan | Emirati | n/a (head of state) | President, United Arab Emirates | Living | Confirmed | Owns Azzam (180m Lürssen, world's longest private yacht). |
| Nancy Walton Laurie | American | Retail/inherited wealth (Walmart, Walton family) | Heiress | Living | Confirmed | Owns Kaos. |
| Nasser Al-Rashid | Saudi | Engineering/royal advisor | Advisor to the Saudi royal family | **Status not independently verified this session** | Widely reported (classic, long-standing case) | Owns Lady Moura (a long-documented, classic superyacht ownership). |
| Oleg Tinkov | Russian (renounced citizenship 2020) | Banking/retail (Tinkoff Bank, founder) | Founder | Living (leukemia diagnosed 2020, in remission since Dec 2020 per reporting) | Confirmed | Owns La Datcha (Damen SeaXplorer, world's first private icebreaker superyacht). |
| Oman Royal (Sultan Haitham) | — duplicate node — | Omani | Sultan of Oman | Living | Confirmed | Same individual as "Sultan Haitham bin Tariq" below — owns Al Said. |
| Oman Royal (Sultan Haitham bin Tariq) | — duplicate node — | Omani | Sultan of Oman | Living | Confirmed | Same individual; owns Fulk Al Salamah. |
| Omani Royal Family | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Also linked to Fulk Al Salamah. |
| Patrick Dovigi | Canadian | Waste management (Green For Life Environmental) | Founder/CEO | Living | Confirmed | Bought Lady Jorgia (ex‑Ahpo) from Michael Lee‑Chin in 2023. |
| Philip Green | British | Retail (Arcadia Group/Topshop) | Former retail tycoon (Arcadia collapsed 2020) | Living | Widely reported | Owns Lionheart. |
| Philip Niarchos | Greek | Shipping (inherited, Niarchos family); art collecting | Heir | Living | Confirmed | Owns Atlantis II (116m, built at family's own Hellenic Shipyard, 1981), one of three sister yachts built for his father Stavros Niarchos. |
| Previously David Geffen (now others) | — ownership-chain placeholder — | n/a | n/a | n/a | Ambiguous | Attached to Pelorus; Geffen's link to Pelorus specifically (vs. his confirmed Rising Sun) was not corroborated — likely a graph placeholder error. |
| Previously Paul Allen (now others) | — ownership-chain placeholder — | n/a | n/a | Paul Allen deceased (2018) | Confirmed | Same Octopus ownership chain as the "Estate of Paul Allen" node above. |
| Qatar Royal | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Linked to Al Mirqab and Katara; corpus separately names former PM Sheikh Hamad bin Jassim bin Jaber Al Thani for Al Mirqab, but that name is not itself a graph node. |
| Qatar (Tamim bin Hamad) | Qatari | n/a (head of state) | Emir of Qatar | Living | Widely reported | Linked to Al Lusail (123m). |
| Rinat Akhmetov | Ukrainian | Metals/mining/energy (System Capital Management) | Founder/Chairman | Living | Widely reported (not self-confirmed) | Linked to Luminance (138.8m Lürssen, delivered 2024); multiple outlets describe him as the "believed" owner rather than a self-disclosed one. |
| Robert Stiller | American | Coffee/retail (Green Mountain Coffee Roasters, founder) | Founder | Living | **Unconfirmed** | No source found tying Stiller to a yacht named Naia; his documented yacht is Grace E (ex‑Andale, 164ft). Likely a graph misattribution. |
| Roger Samuelsson | Swedish | Business/private investment | Businessman | Living | Confirmed | Bought Octopus from the Paul Allen estate (~2022). |
| Roger Samuelsson (ex-Paul Allen estate) | — duplicate node — | — | — | — | — | Same as above. |
| Roman Abramovich | Russian | Metals/oil (ex‑Sibneft, Evraz); former Chelsea FC owner | Businessman | Living (UK/EU sanctioned) | Confirmed | Owns Eclipse (533ft) and Solaris (461ft); both relocated (Turkey/Maldives-area waters) to avoid seizure post‑2022. |
| Samuel Tak Lee | Hong Kong | Real estate (Prudential Enterprises) | Chairman | **Deceased — died 24 May 2026, age 87** | Confirmed | Owned Pelorus (115m Lürssen, acquired 2016, ex‑Abramovich); listed for sale (~€160M asking) as of 2025. Status change should be reflected in the graph. |
| Saudi Royal | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Linked to Alexander, Prince Abdulaziz, and Turama — no single named individual confirmed for these three vessels. |
| Saudi Royal (Mohammed bin Salman) | — duplicate node — | Saudi | Crown Prince & PM | Living | Confirmed | Same as "Mohammed bin Salman" above; owns Serene. |
| Sebastian Kulczyk | Polish | Investment (Kulczyk Investments) | Chairman | Living | Confirmed (**former** owner) | Phoenix 2 (Lürssen, 2010) was built for his late father Jan Kulczyk (d. 2015) and inherited by Sebastian; **sold September 2024**. |
| Sergei Chemezov | Russian | Defense/state industry (Rostec) | CEO, Rostec | Living (US sanctioned) | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Valerie ($153M), seized in Spain, Mar 2022. |
| Sergei Naumenko | Russian | Business (limited public profile) | Businessman | Living (UK sanctioned) | Widely reported (thin sourcing) | No `owned_by` edge in graph (orphan node). Per corpus: owns Phi (192ft), detained in London's Canary Wharf, Mar 2022. **Low confidence this individual meets a "clearly a public figure" bar beyond the sanctions listing** — flag for lighter-touch treatment. |
| Sergey Brin | American | Tech (Google/Alphabet co‑founder) | Co‑founder | Living | Confirmed | Owns Dragonfly (142m, delivered 2024). |
| Sergey Brin (rumored) | — duplicate/likely-erroneous node — | — | — | — | Rumored | Linked in graph to "Dragonfly (Silveryachts)" — inconsistent with Dragonfly's actual builder (Lürssen, not Silveryachts); flag as a probable data artifact. |
| Shahid Khan | American (Pakistani‑born) | Auto parts manufacturing (Flex‑N‑Gate); sports (Jacksonville Jaguars, Fulham FC) | Owner | Living | Confirmed | Owns Kismet (122m Lürssen); available for occasional charter. |
| Sheikh Abdullah Al Thani | Qatari | n/a (royal family, banking background) | Sheikh | Living | **Disputed** | Graph also attributes Opera to "UAE Royal (Abdullah bin Zayed)" — a different person from a different royal family (Al Thani/Qatar vs. Al Nahyan/UAE). This looks like a source conflation; which claim is correct was not resolved this session. |
| Sheikh Mansour | — duplicate node — | Emirati | Deputy PM UAE; Chairman, Mubadala; owner, Manchester City FC | Living | Confirmed | Owns Blue (160.6m Lürssen), which replaced his earlier yacht Topaz. |
| Sheikh Mansour bin Zayed Al Nahyan | — duplicate node — | — | — | — | — | Same individual as above (full name variant). |
| Sheikh Mohammed | — duplicate node — | Emirati | Ruler of Dubai / UAE PM & VP | Living | Confirmed | Same individual as "Dubai Royal" and the full-name variant below. |
| Sheikh Mohammed bin Rashid Al Maktoum | — duplicate node — | Emirati | Ruler of Dubai / UAE PM & VP | Living | Confirmed | Owns Dubai (162m). |
| Sir Michael Hill | New Zealander | Retail (Michael Hill Jeweller, founder) | Founder | Living | Widely reported | Owns The Beast; not independently re-verified via fresh web search this session. |
| Stephen Orenstein | German‑born, US citizen (Dubai‑based) | Logistics (Supreme Group, military logistics contractor) | Founder | Living | Widely reported | Owns Liva O (118m Abeking & Rasmussen, delivered 2023, ~$250M); one source described the owner only as "a mystery billionaire from Dubai," another names Orenstein directly. |
| Suleiman Kerimov | Russian | Mining/finance (Polyus Gold, Nafta Moskva) | Businessman, Federation Council senator | Living (US sanctioned) | Confirmed | No `owned_by` edge in graph (orphan node). Owns Amadea (348ft), seized in Fiji May 2022 in a high-profile US case; Eduard Khudaynatov has separately claimed ownership. |
| Sultan Haitham bin Tariq | Omani | n/a (head of state) | Sultan of Oman | Living | Confirmed | See Oman Royal duplicates above; owns Al Said and Fulk Al Salamah. |
| Tiger Woods | American | Sports (professional golfer) | Athlete | Living | Confirmed | Owns Privacy (~155ft). |
| Turkish Republic | — not an individual — | n/a | Institutional (Turkish state) | n/a | N/A | Savarona (state/presidential yacht). |
| UAE (Mansour bin Zayed) | — duplicate node — | — | — | — | — | Same individual as Sheikh Mansour above. |
| UAE (Mansour bin Zayed Al Nahyan) | — duplicate node — | — | — | — | — | Same individual as Sheikh Mansour above. |
| UAE Royal (Abdullah bin Zayed) | Emirati | n/a (politics) | Deputy PM & Foreign Minister, UAE | Living | **Disputed** | See Sheikh Abdullah Al Thani note above — conflicting Opera attribution. |
| UAE Royal (Hamdan bin Zayed) | Emirati | n/a (politics) | Ruler's Representative, Al Dhafra Region | Living | Widely reported | Owns Yas (converted former Navy frigate). |
| UAE Royal (Mohammed bin Zayed Al Nahyan estate) | — duplicate node, mislabeled — | Emirati | President, UAE | **Living** | Confirmed (Azzam) | MBZ is alive and serving as UAE President — the "estate" framing in this node's name is a graph labeling error; it should not imply he is deceased. |
| UAE (Tahnoun bin Zayed) | Emirati | Politics/business (National Security Advisor; Chairman, ADQ/IHC) | National Security Advisor, UAE | Living | Widely reported | Owns Maryah (125m Elefsis). |
| Unknown (charter-focused) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Loon. |
| Unknown (custom build) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Mansion Yacht. |
| Unknown (disputed) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Alfa Nero (pre‑2024‑sale ownership dispute). |
| Unknown (previously Imperial Yachts) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Lana (managed via Imperial Yachts; beneficial owner undisclosed). |
| Various (ex-John McCaw) | American | Telecom (McCaw Cellular/AT&T Wireless, founder) | Former owner | Living | Widely reported (historical) | Le Grand Bleu (112.8m) was historically linked to John McCaw Jr. as an early owner; since resold to undisclosed parties. |
| Various (residential) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Somnio (residential-yacht concept with multiple unit "owners"). |
| Various (residential superyacht) | — duplicate placeholder — | — | — | — | — | Same as above. |
| Viktor Medvedchuk | Ukrainian | Politics/media | Pro‑Russian Ukrainian politician | Living | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Royal Romance ($200M), seized Rijeka, Croatia, Mar 2022. |
| Viktor Rashnikov | Russian | Steel (Magnitogorsk Iron & Steel Works / MMK) | Chairman | Living (EU sanctioned) | Confirmed | Owns Ocean Victory (140m Fincantieri); relocated to the Maldives to evade seizure. |
| Viktor Vekselberg | Russian | Metals/investment (Renova Group) | Founder | Living (US sanctioned) | Confirmed | No `owned_by` edge in graph (orphan node). Owns Tango (255ft), seized in Mallorca, Spain, Apr 2022. |
| Yiannis Procopiou | Greek | Shipping (presumed) | Unconfirmed | Unknown | **Unconfirmed** | No source found for a "Yiannis Procopiou" or a yacht named "Navtilvs"/"Navtilos." The one well-documented Greek shipping magnate with a similar name is **George Prokopiou** (Dynacom/Sea Traders/Dynagas), who owns a yacht called **Dream**, not Navtilvs. Likely a name/spelling confusion in the source corpus. |

## Suspect yachts

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fulk Al Salamah | Mariotti Yachts (Italy) | 2016 | 164 | 21.04 | 6.01 | 11,000 | 16–22 (sources vary) | 3,000+ | Oman | n/a (not found) | 9714460 (unverified independently) | Oman Royal Yacht Squadron flagship, designer Studio de Jorio; value ~$500M. |
| Blue | Lürssen (Germany) | 2022 | 160.6 | 22.5 | 5.7 | 14,785 | n/a (not found; diesel‑electric hybrid) | n/a (not found) | n/a (not found) | n/a (not found) | n/a (not found) | Design by Terence Disdale; replaces Sheikh Mansour's earlier yacht Topaz; value ~$600M. |
| EIV | Rossinavi (Italy) | 2020 | **48.8** (graph/corpus states 160m — **confirmed data error**) | 8.9 | n/a | 498 | 19 | 3,600 @ 10kn | n/a | n/a | n/a | Graph's 160m LOA is wrong by a factor of ~3.3x; real EIV is a 48.8m Rossinavi, guests/crew ~10/9, consistent with the sale-price figure the corpus carried over. |
| Luminance | Lürssen (Germany) | 2024 | 138.8 | 21 | 5.3 | 9,400 | 20+ | n/a (not found) | n/a (not found) | n/a (not found) | n/a (not found) | Exterior Espen Øino, interior Zuretti Design; owner "believed" (not self-confirmed) to be Rinat Akhmetov; value ~$500M. |
| Savarona | Blohm & Voss (Germany) | 1931 | 135.94 | 16 | 6.1 | 4,701 | 18 | n/a (not found) | Turkey | n/a (not found) | n/a (not found) | Turkish Republic presidential/state yacht; built for Emily Roebling Cadwalader, acquired by Turkey 1938. |
| MYSTERE | Mangusta / Overmarine Group (Italy) | 2023 | **33.29** (graph states 109m — **confirmed unit-conversion error, should be 109 ft**) | 7.39 | 1.9 | 247 | 25 | n/a (not found) | n/a (not found) | n/a (not found) | n/a (not found) | Graph conflated "109 ft" with "109 m"; correct figure is 33.29m/109ft. Multiple other unrelated yachts also share the name "Mystere" (Vitters 43.2m sailing yacht 2006; Lloyds Ships 45.96m 1987) — none is a megayacht. |
| Project Steel | Bugari (Italy) | 1993 | 34 | 6.8 | 2.5 | 190 | 14 | 2,750 | Greece | n/a (not found) | n/a (not found) | Currently a Greek charter yacht (Istion Luxury Yachts); no connection found to any billionaire in this dataset — the "Steel" in the name appears coincidental to Barry Zekelman's "Man of Steel." |
| H3 | Oceanco (Netherlands) | 2000 (rebuilt 2023) | 105.26 | 14.78 | n/a | 3,521 | 18 | 6,000 | n/a | n/a (not found) | n/a (not found) | Real, well-documented vessel, but the graph's Eike Batista ownership link is **not corroborated** — public sources instead name Qatar's former PM, Vijay Mallya, and the Saudi Royal Family as prior owners. |
| Dar | Oceanco (Netherlands) | 2018 | 90.13 | 14.2 | 3.95 | n/a | 20 | n/a (not found) | n/a | n/a (not found) | n/a (not found) | Shark-inspired exterior by Luiz de Basto, interior by Nuvolari Lenard. Note: some brokers list this hull as later renamed "Luna" — a **different, smaller** vessel from the much more famous 115m Lloyd Werft Luna owned by Farkhad Akhmedov; do not conflate the two in the graph. |

**Verdicts:** Fulk Al Salamah — real, confirmed. Blue — real, confirmed. EIV —
real vessel exists, but the graph's 160m/​specs are wrong (actual 48.8m);
correct the LOA field. Luminance — real, confirmed. Savarona — real,
confirmed. MYSTERE — real vessel exists, but the graph's 109m LOA is a
feet‑to‑meters conversion bug (actual 33.29m); correct the LOA field.
Project Steel — real vessel, but no confident owner link to anyone in this
person dataset; likely a coincidental name match. H3 — real vessel, but the
Eike Batista ownership attribution is unconfirmed/likely wrong. Dar — real
vessel, distinct from the Farkhad Akhmedov "Luna."

## Olympic Yacht Services

| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Olympic Yacht Services | Greece | Lavrion | Not independently confirmed under this exact name; the co-located **Olympic Marine** facility was established in 1969 | Boatyard/refit services (haul-out, new small-craft building) plus marina operations | Active | Not identified — appears independently operated (no parent company found) | olympicmarine.gr (marina/boatyard); olympicyachting.com (separate charter operation at the same base) | Search did not surface an entity trading under the exact name "Olympic Yacht Services." The Lavrion waterfront hosts at least two related but distinct businesses: **Olympic Marine** (680-berth marina + boatyard with a ~30-person permanent refit/shipbuilding staff, award-winning refit work) and **Olympic Yachting** (bareboat charter company, solar-powered fleet). If "Olympic Yacht Services" is the builder/refit-yard entity referenced in the graph, it most likely corresponds to Olympic Marine's boatyard operation — this should be confirmed against the original corpus source before being treated as a distinct, separately-founded shipyard. |

## Sources

- [Fulk Al Salamah — Wikipedia](https://en.wikipedia.org/wiki/Fulk_Al_Salamah_(2016_yacht))
- [FULK AL SALAMAH — SuperYachtFan](https://www.superyachtfan.com/yacht/fulk-al-salamah/)
- [Fulk Al Salamah — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/fulk-al-salamah--85175)
- [Blue yacht — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/blue--102495)
- [BLUE Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/project-blue/)
- [EIV yacht — SuperYacht Times](https://www.superyachttimes.com/yachts/eiv/overview)
- [EIV yacht — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/eiv--95031)
- [Luminance (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Luminance_(yacht))
- [Luminance yacht — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/luminance--102491)
- [MV Savarona — Wikipedia](https://en.wikipedia.org/wiki/MV_Savarona)
- [SAVARONA yacht — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/savarona--43461)
- [Mystere yacht (Mangusta) — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/mystere--86705)
- [Project Steel yacht — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/project-steel--73347)
- [H3 yacht — Boat International](https://www.boatinternational.com/yachts/the-superyacht-directory/h3--55451)
- [H3 Yacht for Sale — Northrop & Johnson](https://www.northropandjohnson.com/yachts-for-sale/h3-344-oceanco)
- [Dar (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Dar_(yacht))
- [Meet 'Dar' — Robb Report](https://robbreport.com/motors/marine/gallery/oceanco-dar-superyacht-1235685559/)
- [Olympic Marine](https://www.olympicmarine.gr/gr/en/home/)
- [Olympic Yachting — Lavrion](https://www.olympicyachting.com/en/destinations/lavrion)
- [Man of Steel — Luxurylaunches](https://luxurylaunches.com/transport/man-of-steel-superyacht.php)
- [MAN OF STEEL Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/man-of-steel/)
- [BOLD Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/bold/)
- [VIVA: The $250 Million Superyacht — Boss Hunting](https://www.bosshunting.com.au/motors/boats/viva-superyacht/)
- [VIVA Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/viva/)
- [Robert Stiller — Forbes](https://www.forbes.com/profile/robert-stiller/)
- [Shaky Grounds — Seven Days](https://www.sevendaysvt.com/vermont/shaky-grounds/Content?oid=2184140)
- [John Symond — Wikipedia](https://en.wikipedia.org/wiki/John_Symond)
- [Aussie John Symond lists superyacht Hasna](https://www.apartments.com.au/news/aussie-john-symond-lists-superyacht-hasna-for-160-million-eyeing-a-bigger-future-boat)
- [Herb Chambers Excellence — Boat International](https://www.boatinternational.com/luxury-yacht-life/owners-experiences/abeking-rasmussen-superyacht-excellence-owner-herb-chambers)
- [EXCELLENCE Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/excellence/)
- [Michael Lee-Chin's superyacht — Luxurylaunches](https://luxurylaunches.com/transport/michael-lee-chin-ahpo-superyacht.php)
- [Lee-Chin selling yacht — Jamaica Observer](https://www.jamaicaobserver.com/2023/02/14/lee-chin-selling-yacht/)
- [Samuel Tak Lee — Wikipedia](https://en.wikipedia.org/wiki/Samuel_Tak_Lee)
- [Hong Kong property billionaire Samuel Tak Lee dies — VnExpress](https://e.vnexpress.net/news/business/billionaires/hong-kong-property-billionaire-samuel-tak-lee-dies-5077944.html)
- [PELORUS Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/pelorus/)
- [Stephen Orenstein & family — Forbes](https://www.forbes.com/profile/stephen-orenstein/)
- [LIVA Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/liva-o/)
- [Sebastian Kulczyk — Grokipedia](https://grokipedia.com/page/Sebastian_Kulczyk)
- [Billionaire Jan Kulczyk, owner of superyacht Phoenix 2, dies — Boat International](https://www.boatinternational.com/yachts/news/billionaire-jan-kulcyk-owner-of-superyacht-phoenix-2-dies-at-age-65--27239)
- [Radiant (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Radiant_(yacht))
- [Abdulla Al Futtaim's superyacht — Luxurylaunches](https://luxurylaunches.com/transport/abdulla-al-futtaim-lurssen-radiant-superyacht.php)
- [James Packer's superyacht IJE — NZ Herald](https://www.nzherald.co.nz/nz/james-packers-350m-super-yacht-ije-docks-in-auckland/A2LDDHBUNVBY7DRJBTCWGTLFXQ/)
- [IJE Yacht — SuperYachtFan](https://www.superyachtfan.com/yacht/ije/)
- [TATIANA yacht — Boat International (charter)](https://www.boatinternational.com/charter/luxury-yachts-for-charter/tatiana-bilgin-yachts-2011)
- [Bilgin flagship Tatiana sold and renamed Sevanna — Boat International](https://www.boatinternational.com/yacht-market-intelligence/brokerage-sales-news/bilgin-flagship-tatiana-sold)
- [George Prokopiou — Wikipedia](https://en.wikipedia.org/wiki/George_Prokopiou)
- [Eric Smidt — Wikipedia](https://en.wikipedia.org/wiki/Eric_Smidt)
- [Philip Niarchos / Atlantis II — SuperYachtFan](https://www.superyachtfan.com/yacht/atlantis-ii/owner/)
- [Oleg Tinkov / La Datcha — Boat International](https://www.boatinternational.com/luxury-yacht-life/owners-experiences/oleg-tinkov-owner-la-datcha)
- `knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md` (in-repo corpus, Grok-generated conversation citing Guardian/CNBC/Reuters/NBC/Washington Post/CNN reporting on the 2022 sanctions seizures)
- `knowledge/13_Celebrity_Yachts_Billionaires_Fleets_and_Hotspots.md` and `knowledge/15_Billionaire_Superyacht_Owners_and_Dataset.md` (in-repo corpus, used for cross-checking only, not as a primary source — several of its claims were checked and one, EIV's length, was found to be wrong)
- `knowledge/42_Monaco_Yacht_Show_Key_Players_Charters.md` (in-repo corpus — source of the EIV and MYSTERE data-entry errors identified above)

## Coverage notes

- **110/110 graph person nodes addressed** in the table above, but the 110
  nodes represent roughly **70–75 distinct real individuals**. The rest are:
  (a) name-variant duplicates of the same person (e.g., four separate nodes
  for Sheikh Mansour bin Zayed Al Nahyan, three for Sheikh Mohammed bin
  Rashid Al Maktoum, three for Alisher Usmanov's ownership structure, two
  each for several others); (b) institutional/state placeholders that are
  not people at all (Egyptian Presidential Yacht, Turkish Republic, Bahrain
  Royal, Saudi Royal, Qatar Royal, Omani Royal Family, Indonesian corporate,
  four "Unknown (...)" nodes, three "Various (...)" nodes, one "Mixed
  (...)" node); and (c) "-rumored" variant nodes (Jeff Bezos, Sergey Brin,
  Jack Ma, Dan Snyder) that duplicate a confirmed node for the same person
  with a separate, unconfirmed ownership claim attached. Recommend a graph
  cleanup pass to merge duplicates and tag non-person placeholders with a
  distinct node type before further enrichment rounds.
- **No knowledge-base hits.** `knowledge/entries/` and `knowledge/graph/`
  do not exist in this repository yet (the `knowledge/` directory here is
  the raw 82-document Grok-export corpus, not the lessons-learned KB
  described in the researcher process). All research this round was
  fresh web search plus corpus cross-checking; nothing was skipped on the
  assumption of a prior KB answer.
- **Orphan person nodes with no `owned_by` edge in the graph** (7 total):
  Alexander Mikheev, Gennady Timchenko, Sergei Chemezov, Sergei Naumenko,
  Viktor Medvedchuk, Viktor Vekselberg, Suleiman Kerimov. All seven are
  documented Russian sanctions cases per `knowledge/74`; recommend adding
  the missing `owned_by` edges (Lady Anastasia, Lena, Valerie, Phi, Royal
  Romance, Tango, Amadea respectively).
- **Contradicted/likely-wrong attributions found:** Bilal Hydrie→Tatiana
  (real owner per public sources is Shapoor Mistry); Eike Batista→H3 (public
  sources cite Qatar's ex‑PM, Vijay Mallya, Saudi Royal Family instead);
  Sheikh Abdullah Al Thani vs. UAE Royal (Abdullah bin Zayed) both claiming
  Opera (two different people, two different royal families — unresolved).
- **Unconfirmed/rumored attributions found:** Robert Stiller→Naia; Faisal Al
  Ayyar→Elements; Yiannis Procopiou→Navtilvs (possible confusion with George
  Prokopiou, owner of yacht Dream); Sergey Brin (rumored)→"Dragonfly
  (Silveryachts)" (builder mismatch vs. the confirmed Dragonfly/Lürssen).
- **Status changes not yet reflected in the graph:** Samuel Tak Lee
  (deceased 24 May 2026); Frank Fertitta sold Viva to Ken Griffin (Aug
  2024); John Symond sold Hasna, now renamed Lunasea (~2020); Michael
  Lee-Chin sold Ahpo to Patrick Dovigi, renamed Lady Jorgia (2023);
  Sebastian Kulczyk sold Phoenix 2 (Sept 2024).
- **Public-figure judgment calls:** Sergei Naumenko was kept in the table
  (he is a named, reported sanctions subject) but flagged as low-confidence
  for the "clearly a public figure" bar — his public footprint is thin
  outside the 2022 yacht-seizure coverage. No graph person was fully
  excluded from the table since the task required exact-name coverage of
  all 110 nodes; several were instead flagged as non-persons rather than
  omitted.
- **11% notes coverage baseline was not independently re-derived** — the
  brief's number was taken as given; this report is intended to raise that
  coverage substantially by supplying nationality/industry/role/status/
  confidence for effectively all 110 nodes.
