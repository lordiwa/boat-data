# Builder-Owned Shipyards & Dry Docks Worldwide (Research Lane A)

TASK-016. Facilities owned or operated by yacht builders themselves (not independent
third-party refit yards like Bradford Marine, Derecktor, Lauderdale Marine Center, etc.,
which are excluded from this lane as they are not builder-owned). One row per physical
site. Empty cell = unknown/unverified, not a guess.

Curated from `research/round1/builder-yards.md` for TASK-016 Phase 2 (data-enrichment
loop, round 1). See "## Curation notes" immediately below for cross-file dedup decisions
made against `84_Independent_Refit_and_Haul_Out_Yards_Global.md`.

## Curation notes

Some facilities named in this file and in `84_Independent_Refit_and_Haul_Out_Yards_Global.md`
turned out to be the SAME physical site described from two angles (builder/newbuild vs.
an in-house refit-division brand operating at the same address) — per the "one facility =
one row in one doc" rule, these were merged into a single, richer row here, and the
duplicate row was removed from file 84:

- **Royal Huisman Vollenhove**: merged with 84's "Huisfit Vollenhove" row (same 30,000 sqm
  Vollenhove HQ site; Huisfit is Royal Huisman's own refit division operating there). Added
  Max LOA (81m, from the Huisfit figure) and noted the Huisfit brand/website in Notes.
- **Royal Huisman Amsterdam (ex-Holland Jachtbouw)**: merged with 84's "Huisfit Amsterdam
  (ex Holland Jachtbouw)" row (identical site: same 12,000 sqm ex-Holland Jachtbouw
  premises, same 2019 acquisition date). Noted the Huisfit brand/website and expanded
  services in Notes.
- **Benetti Livorno**: merged with 84's "Lusben Livorno" row (Lusben is Azimut|Benetti
  Group's refit-division brand operating at the same Livorno site — Benetti Livorno's own
  original Notes cell already said "includes Lusben refit division"). Added Max Tonnage
  (18,000t), expanded Dock Dimensions/Lift Type/Services/Founded from the Lusben row, and
  noted the Lusben brand/website in Notes.
- **Benetti Viareggio**: merged with 84's "Lusben Viareggio" row (same site; Benetti
  Viareggio's own original Notes cell already said "Lusben also performs refit/repair here
  for vessels up to 30m"). Added Max Tonnage (600t), Lift Type (travelift), and expanded
  Services/Founded/Notes from the Lusben row.
- **Palumbo Superyachts Ancona**: merged with 84's "Palumbo Ancona" row (same site). Kept
  this file's richer Dry Docks/Dock Dimensions/Lift Type data and added Max LOA (110m) from
  the 84 row.
- **Damen Yachting Vlissingen East Yard**: merged with 84's "Damen Shiprepair Vlissingen"
  row. Both describe a 215m covered dry dock at Damen's Vlissingen site and both cite the
  REV Ocean (195m) outfitting project — strong evidence this is the same physical dock
  described under Damen's two internal division brands (Damen Yachting vs. Damen
  Shiprepair & Conversion). Added the precise 215m x 36m dimension, 51m air draft, 300t
  crane and REV Ocean detail from the 84 row.

Two Palumbo rows in this file's original draft were the LESS detailed copy of a facility
kept instead in file 84 (which had richer dry-dock/lift/service data for these two sites)
— removed from this file, now living only in
`84_Independent_Refit_and_Haul_Out_Yards_Global.md`:

- **Palumbo Superyachts Naples** → see 84's "Palumbo Naples" (merged in the Columbus
  Yachts/ISA/Mondomarine brand-origin note from this file's original row).
- **Palumbo Superyachts Savona** → see 84's "Palumbo Savona" (merged in the "5-yard
  Mediterranean refit network" note from this file's original row).

Two further high-token-overlap pairs were investigated and deliberately kept as SEPARATE
rows (not merged) because they cover functionally distinct programs/docks that may or may
not share one physical basin, and a wrong merge risks conflating incompatible facts more
than a harmless near-duplicate would:

- **Fincantieri Yachts Muggiano (La Spezia)** (this file, megayacht construction) vs.
  `86_Submarine_and_Submersible_Facilities_Global.md`'s "Fincantieri – Muggiano (La Spezia)"
  (submarine/naval construction) — same broader Fincantieri La Spezia complex, but the
  megayacht and U212NFS-submarine work are documented as distinct programs with different
  cited dock dimensions (246.4m x 38m vs. "265m max capacity"). Kept separate; each row now
  cross-references the other in its Notes cell.
- **Fincantieri Yachts Trieste (Arsenale Triestino San Marco)** (this file) vs.
  `85_Commercial_Dry_Docks_Per_Country.md`'s "Fincantieri Trieste (San Marco/Monfalcone)"
  (commercial cruise-ship newbuild) — the commercial-lane row's own title bundles two
  place names (Trieste's San Marco site and Monfalcone, ~30km away), so it isn't certain
  these are the same dock as this file's yacht-service yard. Kept separate rather than
  guess; cross-referenced in Notes.

## Netherlands

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Royal Van Lent (Feadship Kaag) | Netherlands | Kaag | Feadship (Royal Van Lent) | builder + refit yard | 2 | 100 | | | graving dock, slipway | newbuild, refit, repair | 1849 | feadship.nl | Historic Van Lent family yard; "Koninklijk" status granted 2001. |
| Koninklijke De Vries Aalsmeer (Feadship Aalsmeer) | Netherlands | Aalsmeer | Feadship (Koninklijke De Vries) | builder yard | | | | | covered dry dock | newbuild, engineering | 1906 | feadship.nl | HQ of De Vries yard; "Koninklijk" status granted 2006. |
| De Vries Makkum (Feadship Makkum) | Netherlands | Makkum | Feadship (Koninklijke De Vries) | builder + refit yard | 1 | 120+ | | | covered dry dock | newbuild, refit | 2005 | feadship.nl | 170m construction shed with a giant dry dock; deep-water access enables 120m+ builds. |
| Royal Van Lent Amsterdam (Feadship Amsterdam) | Netherlands | Amsterdam | Feadship (Royal Van Lent) | builder + refit yard | 1 | 160 | | | covered dry dock | newbuild, refit | 2019 | feadship.nl | Newest Feadship dock, Westpoort area; raised group max LOA to 160m. |
| Oceanco Alblasserdam | Netherlands | Alblasserdam | Oceanco | builder yard | 1 | 160 | | 10m depth, 33m hall height, 5,500 sqm floor | covered dry dock | newbuild, engineering | 1987 | oceanco.com | Segmented dry dock doors allow simultaneous multi-project use; 150-160m facility per recent expansion. |
| Damen Yachting Vlissingen City Yard | Netherlands | Vlissingen | Damen Yachting / Amels | builder + refit yard | 2 | | | 145m dock; 205m dock | covered dry dock | newbuild, refit, repair | | damenyachting.com | Naval-size sea lock gives protected North Sea access. |
| Damen Yachting Vlissingen East Yard | Netherlands | Vlissingen | Damen Yachting / Amels | builder + refit yard | 2 | 195 | | 215m dock (215m x 36m covered dry dock, 51m air draft, 300t overhead crane); 175m dock | covered dry dock | newbuild, refit, repair, conversion, engineering | 1960 | damenyachting.com | Historic Amels site; 215m dock cited as able to accommodate the world's largest yachts. CURATION MERGE: same 215m covered dry dock as research/round1/independent-refit.md's "Damen Shiprepair Vlissingen" row (now removed from 84 as a duplicate) — contracted to complete outfitting of REV Ocean (195m), set to be the world's largest yacht on delivery. |
| Heesen Oss | Netherlands | Oss | Heesen Yachts | builder yard | 1 | 83 | | 85m dry dock (completed 2016) | covered dry dock | newbuild, engineering | 1978 | heesenyachts.com | New dry dock enabled move toward an 80m+ flagship. |
| Royal Huisman Vollenhove | Netherlands | Vollenhove | Royal Huisman | builder yard | | 81 | | 30,000 sqm site, 5 shipbuilding halls | slipway | newbuild, engineering, refit, repair, conversion | 1884 | royalhuisman.com | Deep-water site since 1970; sailing and motor superyacht specialist. CURATION MERGE: also home to "Huisfit," Royal Huisman's own refit division (huisfit.com) — same 30,000 sqm site; refit/repair/conversion up to 81m per Huisfit's own figures (see research/round1/independent-refit.md, now removed from 84 as a duplicate). |
| Royal Huisman Amsterdam (ex-Holland Jachtbouw) | Netherlands | Amsterdam | Royal Huisman | refit yard | | | | 12,000 sqm | | refit, conversion, repair | 2019 (acquired) | royalhuisman.com | Added for superyacht refits, conversions and rebuilds. CURATION MERGE: operates under the "Huisfit" refit-division brand (huisfit.com) at this same ex-Holland Jachtbouw premises (see research/round1/independent-refit.md, now removed from 84 as a duplicate). |

## Germany

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lürssen Bremen-Vegesack | Germany | Bremen | Lürssen | builder + refit yard | | 100+ | | | | newbuild, refit, engineering | 1875 | lurssen.com | Group headquarters and design/engineering center. |
| Lürssen Aumund | Germany | Bremen | Lürssen | builder yard | 1 | | | 220m floating dry dock | floating dock | newbuild, refit | | lurssen.com | Founding site of Friedrich Lürssen's original workshop (1875). |
| Lürssen Lemwerder | Germany | Bremen (Lemwerder) | Lürssen | builder yard | | | | 127,000 sqm site | | newbuild, engineering | | lurssen.com | Full construction, production and assembly spectrum. |
| Lürssen Berne | Germany | Bremen (Berne) | Lürssen | builder + refit yard | 1 | 150 | 4,800 | 400,000 sqm site | floating dock, syncrolift | newbuild, refit | | lurssen.com | Floating dock with synchrolift can elevate ships to 150m/4,800t. |
| Lürssen Rendsburg (Kröger Werft) | Germany | Rendsburg | Lürssen | builder + refit yard | | 110 | | | | newbuild, refit, repair | | lurssen.com | Custom yachts 55-110m; sits on the Kiel Canal linking North and Baltic Seas. |
| Blohm+Voss Hamburg | Germany | Hamburg | Lürssen | refit yard | 1 | | | 351m x 59m dock | graving dock, floating dock | refit, repair, conversion | 1877 (yard); 2016 (Lürssen acquisition) | lurssen.com | One of northern Europe's largest dry docks; downsized 2021, ceased cruise/tanker refit work. CURATION NOTE: `85_Commercial_Dry_Docks_Per_Country.md` separately lists this same Elbe 17 dock ("Blohm+Voss (Elbe 17)") under its current 2025-era operator NVL Group (Rheinmetall) — kept as two rows (this one reflects the yacht-refit-relevant Lürssen-era description; 85's row is the current commercial-repair-focused listing) rather than merged, since the operator attribution genuinely changed over time and collapsing them risks misattributing current ownership. |
| Peene-Werft Wolgast | Germany | Wolgast | Formerly Lürssen/NVL; sold to Rheinmetall in 2025 | builder yard | | | | 250,000 sqm site, 46,500 sqm covered halls | | newbuild, repair | 1948 | nvl.de | Naval/coastguard vessel specialist, not primarily a yacht yard; no longer Lürssen-owned as of 2025 — included per task scope but ownership has changed. |
| Nobiskrug Rendsburg | Germany | Rendsburg | Nobiskrug | builder yard | | | | | | newbuild, refit | 1905 | nobiskrug.com | Built Sailing Yacht A and Artefact; distinct site/company from Lürssen's Rendsburg (Kröger Werft) yard. |
| Abeking & Rasmussen Lemwerder | Germany | Lemwerder | Abeking & Rasmussen | builder + refit yard | 1 | 125 | | 65m, 85m, 85m and 125m sheds; inner harbour | covered dry dock, syncrolift | newbuild, refit, repair | 1907 | abeking.com | Family-owned; five production halls plus syncrolift in an inner harbour. |

## Italy

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Benetti Livorno | Italy | Livorno | Azimut-Benetti Group | builder + refit yard | 2 | 100 | 18000 | max dock 350m (per TrustedDocks); Lusben's 180m floating dock plus a keel pit to 12m/8.5m deep | graving dock, floating dock, shiplift | newbuild, refit, repair, paint, engineering, storage | 1956 (Lusben Livorno site acquired 2004) | benettiyachts.it | Described as the largest active shipyard site in the world by area (~190,000-240,000 sqm). CURATION MERGE: includes Lusben refit division (up to 120m; lusben.com); hub for yachts >50m, ~80 combined Livorno+Viareggio Lusben projects/yr, 70m/2,500t Syncrolift, 25 dry berths, 80t crane (merged from research/round1/independent-refit.md's "Lusben Livorno" row, now removed from 84 as a duplicate). |
| Benetti Viareggio | Italy | Viareggio | Azimut-Benetti Group | builder + refit yard | | 70 | 600 | 98,000 sqm site (32,000 covered) | travelift | newbuild, refit, repair, paint, storage | 1956 (Lusben yard); 1990 (Benetti Viareggio yard acquired) | benettiyachts.it | Indoor building up to 70m. CURATION MERGE: Lusben also performs refit/repair here for vessels up to 30m (600t travel lift, 30,000 sqm marina with 34 yacht berths) — merged from research/round1/independent-refit.md's "Lusben Viareggio" row, now removed from 84 as a duplicate. |
| Azimut Fano | Italy | Fano | Azimut-Benetti Group | builder yard | | | | 17,000 sqm site (7,000 covered) | | newbuild | 1998 (yard acquired) | azimutyachts.com | Builds the Magellano and S Series lines. |
| Azimut Avigliana | Italy | Avigliana | Azimut-Benetti Group | builder yard | | 21 | | 121,500 sqm site (51,000 covered) | | newbuild | | azimutyachts.com | Group headquarters/main production for fiberglass yachts up to ~21m/68ft. |
| Azimut Savona | Italy | Savona | Azimut-Benetti Group | refit yard | | | | 9,700 sqm site (4,800 covered) | | refit, repair | | azimutyachts.com | Service, outfitting and delivery center at Marina Savona. |
| Sanlorenzo Ameglia | Italy | Ameglia (La Spezia) | Sanlorenzo | builder yard | | | | | | newbuild, engineering | 1958 | sanlorenzoyacht.com | Group headquarters; medium/large yacht production. |
| Sanlorenzo La Spezia (San Marco) | Italy | La Spezia | Sanlorenzo | builder yard | | | | 50,000 sqm site | floating dock | newbuild | | sanlorenzoyacht.com | Dedicated superyacht production site; floating dry dock beside the new construction shed. |
| Sanlorenzo Viareggio | Italy | Viareggio | Sanlorenzo | builder yard | | | | | | newbuild | | sanlorenzoyacht.com | Fiberglass motoryachts over 100 ft (30m+). |
| Sanlorenzo Massa | Italy | Massa | Sanlorenzo | builder yard | | | | | | engineering | | sanlorenzoyacht.com | Study/development center for new models rather than production. |
| Ferretti Group Ancona (CRN / Custom Line / Riva Superyacht / Pershing) | Italy | Ancona | Ferretti Group | builder yard | | 95 | 3,000 GT | 3 sheds | | newbuild, engineering | | ferrettigroup.com | "Crown jewel" of the group; CRN custom vessels to 95m/3,000GT plus Custom Line 30-44m composite range. |
| Ferretti Group Mondolfo (Pershing) | Italy | Mondolfo | Ferretti Group | builder yard | | | | 45,000 sqm site | | newbuild | 2004 | pershing-yacht.com | Pershing's main production base, ~3km from the sea. |
| Ferretti Group Cattolica (Ferretti Yachts) | Italy | Cattolica | Ferretti Group | builder yard | | | | | | newbuild | | ferrettiyachts.com | Group's smallest production facility; formerly also built Custom Line models. |
| Ferretti Group Forlì | Italy | Forlì | Ferretti Group | builder yard | | | | 52,000 sqm site | | newbuild, engineering, paint | | ferrettigroup.com | Group HQ; smaller Ferretti Yachts models, Itama 62RS, Plug & Mould Plant, Wallytender/Wallypower. |
| Ferretti Group La Spezia | Italy | La Spezia | Ferretti Group | builder + refit yard | | | | 64,000 sqm site, 400+ m of docks, 33 berths | | newbuild, refit | | ferrettigroup.com | 4 industrial sheds and 2 paint sheds; recently modernized. |
| Ferretti Group Sarnico (Riva) | Italy | Sarnico | Ferretti Group | builder yard | | | | 43,000 sqm site (17,000 covered) | | newbuild, paint | | rivayacht.com | Historic home of Riva since its wooden-hull era; 4 paint halls. |
| Ferretti Group San Vitale / Ravenna (Wally, INFYNITO) | Italy | Ravenna | Ferretti Group | builder yard | | | | 70,000 sqm site | | newbuild, conversion | 2023 (acquired from Rossetti Marino) | ferrettigroup.com | Allocated to Wally sailing yacht construction and the Ferretti Yachts INFYNITO range. |
| Overmarine (Mangusta) Viareggio | Italy | Viareggio | Overmarine Group | builder yard | | | | | | newbuild, engineering | | mangustayachts.com | HQ; focuses on Mangusta Maxi Open models. |
| Overmarine (Mangusta) Pisa | Italy | Pisa | Overmarine Group | builder yard | | 70 | | 44,000 sqm site | | newbuild | | mangustayachts.com | Metalworking for Mangusta Oceano and GranSport lines. |
| Overmarine (Mangusta) Massa | Italy | Massa | Overmarine Group | builder yard | | | | | | engineering | | mangustayachts.com | Forming/rolling for large composite yacht components. |
| Baglietto Varazze | Italy | Varazze | Baglietto (Gruppo Gavio) | builder yard | | | | | | newbuild | 1854 | baglietto.com | Original founding site; racing sailboats then early motor yachts (Giuseppina, 1906). |
| Baglietto La Spezia (Cantieri di Pisa) | Italy | La Spezia | Baglietto (Gruppo Gavio) | builder + refit yard | 2 | | | 85m x 2 dry docks | graving dock | newbuild, refit | 1999 (acquired ex-Ferrari yard) | baglietto.com | 32,000 sqm site added to Baglietto in 1999; Gruppo Gavio investment from 2012. |
| Perini Navi Viareggio | Italy | Viareggio | Sold by The Italian Sea Group to Next Yacht Group in 2024 | builder yard | | 60 | | | | newbuild, refit | 1983 | perininavi.it | No longer TISG-owned; sailing yachts up to 60m built here historically. |
| The Italian Sea Group La Spezia / Marina di Carrara | Italy | Marina di Carrara / La Spezia | The Italian Sea Group | builder + refit yard | | | | | | newbuild, refit | | theitalianseagroup.com | Handles Perini Navi/TISG large-yacht builds since the 2021 Perini Navi acquisition. |
| Tankoa Yachts Genova (Sestri Ponente) | Italy | Genoa | Tankoa Yachts | builder yard | 1 | 90 | 4,000 | | floating dock | newbuild, engineering | 2008 | tankoa.it | 20,000 sqm site beside Marina Genova; permanent floating dry dock up to 90m/4,000t. |
| Palumbo Superyachts Naples | Italy | Naples | Palumbo Group (Columbus Yachts, ISA, Mondomarine brands) | builder + refit yard | | | | | | newbuild, refit, repair | 2008 (Columbus Yachts founded) | palumbogroup.it | REMOVED (curation merge): consolidated into `84_Independent_Refit_and_Haul_Out_Yards_Global.md`'s "Palumbo Naples" row, which has more complete dry-dock/lift data; this file's Columbus Yachts/ISA/Mondomarine brand-origin note was merged into that row's Notes. |
| Palumbo Superyachts Ancona | Italy | Ancona | Palumbo Group | builder + refit yard | | 110 | 3,300 | 52,000 sqm site, 3 pre-existing sheds + new facility | shiplift, travelift | newbuild, refit, repair | | palumbogroup.it | 560t travel lift plus a 3,300t lifting platform, among the largest on the Adriatic. CURATION MERGE: Max LOA (110m) merged in from research/round1/independent-refit.md's "Palumbo Ancona" row (now removed from 84 as a duplicate; that row's "one of 7 Palumbo Mediterranean yards" context noted here). |
| Palumbo Superyachts Savona | Italy | Savona | Palumbo Group | refit yard | | | | | | refit, repair | | palumbogroup.it | REMOVED (curation merge): consolidated into `84_Independent_Refit_and_Haul_Out_Yards_Global.md`'s "Palumbo Savona" row, which has more complete lift/service data; this file's "part of the 5-yard Mediterranean refit network" note was merged into that row's Notes. |
| Fincantieri Yachts Muggiano (La Spezia) | Italy | La Spezia | Fincantieri Yachts | builder yard | 1 | | | 246.4m x 38m dock | graving dock | newbuild, engineering | | fincantieriyachts.it | Primary construction site for Fincantieri's megayachts. See Curation notes above re: `86_Submarine_and_Submersible_Facilities_Global.md`'s "Fincantieri – Muggiano (La Spezia)" — same broader complex, distinct (submarine) program, kept as a separate row rather than merged. |
| Fincantieri Yachts Trieste (Arsenale Triestino San Marco) | Italy | Trieste | Fincantieri Yachts | refit yard | | | | | | refit, repair, maintenance | | fincantieriyachts.it | Dedicated post-delivery service/maintenance yard alongside Muggiano. See Curation notes above re: `85_Commercial_Dry_Docks_Per_Country.md`'s "Fincantieri Trieste (San Marco/Monfalcone)" — possibly the same San Marco site described from a commercial-newbuild angle, or a distinct Monfalcone dock; kept separate rather than guess. |

## Turkey

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Turquoise Yachts Istanbul (Pendik) | Turkey | Istanbul | Turquoise Yachts | builder yard | | 90 | | | | newbuild | 1997 | turquoiseyachts.com | Over 20 megayachts delivered, 40-90m range. |
| Turquoise Yachts Kocaeli | Turkey | Kocaeli | Turquoise Yachts | builder yard | | | | | | newbuild | | turquoiseyachts.com | Second Turquoise production site. |
| Bilgin Yachts Yalova | Turkey | Yalova | Bilgin Yachts | builder yard | | 120 | | 40,000 sqm site | | newbuild, engineering | | bilginyacht.com | Hull/superstructure assembly; can run up to 5 projects at once (two 85-120m + three 50-65m). |
| Bilgin Yachts Istanbul | Turkey | Istanbul | Bilgin Yachts | builder yard | | | | part of 79,000+ sqm group total | | newbuild, engineering | | bilginyacht.com | Outfitting/HQ site; hulls transferred here from Yalova. |
| Sirena Marine Bursa | Turkey | Bursa | Sirena Marine (Kıraça Holding) | builder yard | | | | ~1.7 million sq ft site | | newbuild | 2006 | sirenayachts.com | Azimut-Benetti Group partnership since 2008; flagship Sirena 88 is largest model to date. |
| Sunrise Yachts Antalya | Turkey | Antalya (Free Zone) | Sunrise Yachts | builder yard | | 68 | | 30,000 sqm site, 5 assembly hangars | | newbuild, paint | 2006 | sunriseyachts.com | Custom steel/aluminum yachts 45-68m; paint room (4,200 sqm) handles vessels up to 60m. |
| Alia Yachts Antalya | Turkey | Antalya | Alia Yachts | builder + refit yard | | 80 | | 25,000+ sqm indoor, 5 construction halls | | newbuild, refit | 2003 | aliayachts.com | Lloyd's-certified; steel construction/refit up to 80m. |
| Ada Yacht Works (Bodrum/Göcek Bay) | Turkey | Bodrum | Ada Yacht Works | builder yard | | 50 | | 4,000 sqm covered workshops | | newbuild | | adayachtworks.com | Task brief cites "Antalya" but the yard's own site places it on the Göcek Bay coast near Bodrum; builds steel, aluminum and wood yachts up to 50m. |

## UAE

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gulf Craft Umm Al Quwain | United Arab Emirates | Umm Al Quwain | Gulf Craft | builder yard | | 53 | | 462,000 sq ft site | | newbuild, engineering | 1982 | gulfcraftinc.com | Emirate's original shipyard; main production for vessels 32-175 ft (~10-53m). |
| Gulf Craft Ajman (Superyacht Service Centre) | United Arab Emirates | Ajman | Gulf Craft | refit yard | | 60 | | 108,000 sq ft service center | travelift | refit, repair | | gulfcraftgroup.com | Certified 600-ton Cimolai travel lift; handles yachts up to 60m. |

## United States

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Westport Yachts Port Angeles | United States | Port Angeles, WA | Westport Yachts | builder + refit yard | | 50 | 500 | paint booth 190ft x 52ft; two 200ft floating docks | travelift | newbuild, refit, repair, paint | 1964 | westportyachts.com | 500-ton travel lift (max beam 32 ft); builds 112-164 ft (34-50m) range. |
| Westport Yachts Hoquiam | United States | Hoquiam, WA | Westport Yachts | builder yard | | 50 | | | | newbuild | | westportyachts.com | Second Westport production shipyard alongside Port Angeles. |
| Delta Marine Seattle | United States | Seattle, WA | Delta Marine | builder + refit yard | | | 440 | | travelift | newbuild, refit, repair | 1961 | deltamarine.com | 440-ton travel lift; covered refit bays. |
| Christensen Shipyards Vancouver, WA (former) | United States | Vancouver, WA | Christensen Yachts (ceased 2015; site sold to Vigor Industrial 2019) | builder yard | | | | 180,000 sq ft climate-controlled facility | | newbuild (historical) | 1983 | christensenyachts.com | Production halted 2015 amid receivership; brand relocated to Tellico Lake, TN; original WA site now Vigor Industrial. |

## Taiwan

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Horizon Yachts Kaohsiung (main) | Taiwan | Kaohsiung | Horizon Yacht Group | builder yard | | | | 463,000 sq ft site | | newbuild, engineering | 1987 | horizonyacht.com | Group also owns the Vision, Premier and Atech yards in Taiwan. |
| Horizon Premier Shipyard (Delivery & Refit Center) | Taiwan | Kaohsiung | Horizon Yacht Group | refit yard | | | | 260,000 sq ft site; 200m (656 ft) waterfront | | refit, repair, maintenance | | horizonyacht.com | OHSAS 18001 certified refit/delivery facility at the Port of Kaohsiung. |
| Ocean Alexander Kaohsiung | Taiwan | Kaohsiung | Ocean Alexander | builder yard | | | | | | newbuild | 1977 | oceanalexander.com | Founded by Alexander Chueh; Taiwan's other major custom/semi-custom builder alongside Horizon. |

## United Kingdom

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Princess Yachts Plymouth (incl. South Yard) | United Kingdom | Plymouth | Princess Yachts | builder yard | | | | ~1.1 million sq ft combined across 5 sites (~25 acres) | | newbuild, engineering | 1965 | princessyachts.com | South Yard (ex-Devonport Naval Base) acquired 2009 for the 100ft+ M Class (30M/35M/40M). |
| Sunseeker Poole | United Kingdom | Poole | Sunseeker International | builder yard | | | | | | newbuild | 1969 | sunseeker.com | UK's other major volume builder alongside Princess; anchored to its home town since founding. |

## Australia

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SilverYachts Henderson | Australia | Henderson, WA | SilverYachts | builder yard | | | | | | newbuild, engineering | 2005 (as Hanseatic Marine; rebranded 2014) | silveryachts.com | Built the aluminium Silver Fast, once the world's largest aluminium yacht. |
| Echo Yachts Henderson | Australia | Henderson, WA | Echo Yachts (Echo Marine Group) | builder + refit yard | | | 12,000 | 103m and 80m shipbuilding halls | slipway, syncrolift, floating dock | newbuild, refit, repair | | echoyachts.com.au | 800t slipway with transfer trolley, 8,000t syncrolift and 12,000t floating dock at the Australian Marine Complex. |

## Other regions

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Azimut Itajai | Brazil | Itajai | Azimut-Benetti Group | builder yard | | 30 | | 43,000 sqm site (22,000 covered) | | newbuild | | azimutyachts.com | Builds Azimut models up to 30m for the South American market. |
| Gulf Craft Maldives | Maldives | (unspecified atoll) | Gulf Craft | builder yard | | | | 100,000 sq ft site | | newbuild | | gulfcraftgroup.com | Secondary Gulf Craft production facility outside the UAE. |

## Sources

- https://www.feadship.nl (via search snippets and Wikipedia cross-check)
- https://en.wikipedia.org/wiki/Feadship
- https://www.azimutbenetti.com/our-shipyards/
- https://www.lurssen.com/en/about/locations/
- https://www.lurssen.com/en/about/locations/hamburg/
- https://www.trusteddocks.com/shipyards/7845-luerssen-werft-bremen-lemwerder
- https://www.trusteddocks.com/shipyards/7848-luerssen-werft-bremen-berne
- https://www.trusteddocks.com/shipyards/7846-luerssen-werft-bremen-aumund
- https://www.trusteddocks.com/shipyards/7847-luerssen-rendsburg
- https://en.wikipedia.org/wiki/L%C3%BCrssen
- https://nvl.de/en/shipyards-and-docks/peene-werft
- https://en.wikipedia.org/wiki/Peene-Werft
- https://www.rheinmetall.com/en/media/news-watch/news/2025/09/2025-09-15-rheinmetall-reaches-agreement-with-luerssen-on-acquisition-of-naval-vessels-luerssen-nvl
- https://www.charterworld.com/news/oceancos-impressive-new-superyacht-building-and-dry-dock-facility
- https://en.wikipedia.org/wiki/Oceanco
- https://www.peikko.com/reference/oceanco-yachts-shipyard/
- https://www.damenyachting.com/about/yards/drydocks
- https://www.damenyachting.com/about/yards/vlissingen-city
- https://www.damenyachting.com/about/yards/vlissingen-east
- https://www.boatinternational.com/yachts/news/heesen-yachts-targets-80m-flagship-with-new-dry-dock--32061
- https://boats.drivemag.com/news/heesen-shipyards-completes-new-85m-dry-dock/
- https://en.wikipedia.org/wiki/Royal_Huisman
- https://www.royalhuisman.com/en/discover/the-shipyard/vollenhove/
- https://sanlorenzoyachts.co.uk/shipyard/
- https://www.sanlorenzoyacht.com/uk/news-and-events/sanlorenzo-new-facilities-at-the-ameglia-headquart.asp
- https://www.ferrettigroup.com/en-us/Corporate/Shipyards/Ancona
- https://www.ferrettigroup.com/en-us/Corporate/Shipyards/Sarnico
- https://yachtstyle.co/shipyard-ferretti-group-202301-pt1/
- https://yachtstyle.co/shipyard-ferretti-group-202301-pt2/
- https://megayachtnews.com/2023/03/ferretti-group-acquires-additional-shipyard-for-big-boats/
- https://megayachtnews.com/2024/07/ferretti-group-superyacht-yard-ancona/
- https://www.mangustayachts.com/en/locations
- https://en.wikipedia.org/wiki/Perini_Navi
- https://www.marketscreener.com/quote/stock/THE-ITALIAN-SEA-GROUP-S-P-123529023/news/The-Italian-Sea-Group-completes-sale-of-Viareggio-shipyard-46956397/
- https://theitalianseagroup.com/perini-navi-viareggio-inaugurated-the-new-commercial-flagship-and-the-carpentry-business-unit/
- https://tankoa.it/shipyard/
- https://www.portsofgenoa.com/en/port-basins-logistics/port-activities/operators/drydocks-and-workshops/tankoa-yachts-s-p-a.html
- https://www.palumbogroup.it/palumbo-shipyards
- https://www.superyachtnews.com/operations/palumbo-superyachts-completes-new-ancona-facility
- https://www.trusteddocks.com/shipyards/7624-fincantieri-la-spezia-shipyard-muggiano
- https://www.fincantieriyachts.it/en/
- https://www.superyachttimes.com/companies/bilgin-yachts
- https://bilginyacht.com/EN/yalova
- https://www.superyachttimes.com/companies/sunrise
- https://www.boatinternational.com/yachts/news/sunrise-yachts-opens-new-facility-in-antalya--16327
- https://www.denisonyachtsales.com/2025/05/inside-turkeys-superyacht-industry-denisons-tour-of-10-turkish-shipyards/
- https://aliayachts.com/contact/
- https://www.superyachttimes.com/companies/ada-yacht-works
- https://www.adayachtworks.com/
- https://gulfcraftgroup.com/shipyards
- https://gulfcraftgroup.com/news/key-infrastructure-now-coming-online-at-sysc-ajman
- https://www.thenationalnews.com/news/uae/2025/02/27/inside-the-uaes-biggest-superyacht-builder-in-umm-al-quwain/
- https://www.fishercgi.com/project/westport-yachts/
- http://shipbuildinghistory.com/shipyards/yachtlarge/westport.htm
- https://navalmarinearchive.com/sbh/shipyards/yachtlarge/christensen.html
- https://en.wikipedia.org/wiki/Christensen_Shipyards
- https://yachtharbour.com/news/us-builder-christensen-shipyards-moves-its-production-facility-after-years-of-legal-arguments-3022
- https://www.horizonyacht.com/organization
- https://en.wikipedia.org/wiki/Horizon_Yacht
- https://en.wikipedia.org/wiki/Ocean_Alexander
- https://en.wikipedia.org/wiki/Princess_Yachts
- https://www.boatinternational.com/profiles/princess--17333
- https://en.wikipedia.org/wiki/SilverYachts (via search snippets)
- https://www.echomarinegroup.com/about-echo-yachts/
- https://www.superyachtnews.com/business/echo-yachts-australia-white-rabbit-echo-lomocean-sam-sorgiovanni-hernderson-marine-precinct-one2three-naval-architects-australia
- https://en.wikipedia.org/wiki/Abeking_%26_Rasmussen
- https://www.burgessyachts.com/en/build-a-yacht/shipyards/abeking-rasmussen
- https://www.boatinternational.com/showcase/baglietto-yachts/shipyard-170-anniversary
- https://www.superyachttimes.com/yacht-news/the-baglietto-varazze-shipyard
- (Curation-round merge sources, see 84's own Sources list: MB92/Lusben/Huisfit citations there apply to the merged rows above.)

## Coverage notes

**Builders/facilities the task named but I could NOT find distinct facility data for:**
- Nobiskrug's exact site size, dry dock dimensions, and current dock count (only qualitative descriptions found; it is a separate company from Lürssen's own Rendsburg yard, though both sit in the same town — this is a real and easy point of confusion for the graph).
- Cristensen/Christensen's current Tellico Lake, TN facility (only the defunct Vancouver, WA site was documented in depth).
- Silveryachts' precise site area and dock/lift infrastructure (only Echo Yachts, its Henderson neighbour, had detailed lift specs).
- Detailed dry dock/dock dimensions for most Italian mid-size yards (Sanlorenzo's four sites, Overmarine's three sites, Baglietto Varazze) — site areas were found but not dock lengths/widths.
- Fano's original founding year as a shipyard (only the 1998 Benetti/Azimut acquisition date was confirmed).
- Turquoise Yachts' Kocaeli site details (only confirmed to exist, no size/dock data).
- Sirena Marine's precise dock/lift infrastructure (site area only).

**Data points I am least confident about (flag before use in the graph):**
- Peene-Werft Wolgast's Lürssen/NVL affiliation is stated in the task brief, but NVL (and Peene-Werft with it) was sold to Rheinmetall in 2025 per a September 2025 Rheinmetall press release — it is arguably no longer a "builder-owned yacht yard" under Lürssen at all, and its primary business is naval, not yachts.
- "Max LOA" figures pulled from third-party broker/aggregator pages (itBoat, TrustedDocks, Arcon Yachts, Aberton Yachts) rather than shipyard primary sources for several Turkish and Italian rows — treated as indicative, not authoritative.
- Ada Yacht Works' location: the task brief lists it under Turkey generally near Antalya-area builders, but the company's own site places it on the Göcek Bay coast near Bodrum — flagged in the Notes column rather than silently corrected.
- Perini Navi Viareggio's ownership is in flux (sold by The Italian Sea Group to Next Yacht Group in 2024); treated here as a legacy/historical builder site rather than a current TISG asset.
- Palumbo Group's group-wide claim of "18 dry docks up to VLCC size" could not be reliably apportioned to individual sites, so no per-facility dry-dock counts are given for the Palumbo rows beyond Ancona's named travelift/lifting-platform.
- The local /knowledge corpus in this repo (Grok-export conversational documents, e.g., files 75, 77, 79) contains additional narrative detail on Feadship, Oceanco and Lürssen but is AI-generated, undated-source, and occasionally self-promotional ("why Grok is #1") — used only as a lead-generation aid, not cited as a source of fact above.
