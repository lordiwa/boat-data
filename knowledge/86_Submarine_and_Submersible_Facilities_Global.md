# Submarine & Submersible Dry Dock / Service Facilities — Global List

Research Lane E for TASK-016. Public-information-only survey spanning
personal/luxury submersibles through commercial tourist/research subs to
major naval submarine dry docks, so the DataYacht dry-dock dataset can span
"superyacht to submarine." Empty cells mean the fact was not found in a
public source during this pass — nothing here is guessed.

Curated from `research/round1/submarine-facilities.md` for TASK-016 Phase 2.
See "## Curation notes" for cross-file dedup decisions made against
`84_Independent_Refit_and_Haul_Out_Yards_Global.md` and
`85_Commercial_Dry_Docks_Per_Country.md`.

## Curation notes

**Review carry-forward (TASK-016 review, applied in TASK-017):** Norfolk Naval
Shipyard's Max Tonnage cell originally read "Nimitz-class capable (Dry Dock
8)" — prose, not a number — which `shipyardMapper.js`'s numeric parser read
back as tonnage=8. Blanked per the "never guess" rule; the Nimitz-class detail
now lives in the row's Notes cell instead.

Four rows from this file's original "Naval submarine dry docks" section turned
out to be the SAME overall shipyard entity as a row already kept (and now
enriched) in another file, and were removed here (per the "one facility = one
row in one doc" rule) — in each case, this row's submarine/naval-program detail
was merged into the surviving row's Notes cell before removal:

- **Navantia – Cartagena** → merged into `84_Independent_Refit_and_Haul_Out_Yards_Global.md`'s
  "Navantia Cartagena" row (that lane's yacht/commercial-refit framing was
  judged the better primary home for this state yard; its submarine-fleet/S-80
  program role is now noted there).
- **HD Hyundai Heavy Industries – Ulsan** → merged into
  `85_Commercial_Dry_Docks_Per_Country.md`'s "HD Hyundai Heavy Industries
  Ulsan" row (richer commercial dock data there: Max LOA 672m, dock
  dimensions).
- **Hanwha Ocean – Okpo (Geoje) Shipyard** → merged into `85`'s "Hanwha Ocean
  (Okpo Shipyard)" row (richer commercial dock data there: Max Tonnage
  1,000,000t, website).
- **Newport News Shipbuilding (HII)** → merged into `85`'s "Newport News
  Shipbuilding (Dry Dock 12)" row (richer commercial dock data there: Max LOA
  662m, dock dimensions, Ford-class carrier detail).

Two rows were investigated for a possible duplicate and deliberately kept
SEPARATE (not merged) — see the fuller reasoning in
`83_Builder_Shipyards_and_Dry_Docks_Global.md`'s Curation notes:

- **Fincantieri – Muggiano (La Spezia)** (this file, U212NFS submarine
  construction) vs. `83`'s "Fincantieri Yachts Muggiano (La Spezia)"
  (megayacht construction) — likely the same broader Fincantieri complex but
  documented as distinct programs/docks with different cited dimensions; kept
  as two separate rows, cross-referenced in each other's Notes.

## Submersible builders & service

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Triton Submarines – Sebastian facility | USA | Sebastian, FL | Triton Submarines LLC | submersible builder | | | | | | newbuild, service, refit, repair | 2007 | tritonsubs.com | 25,000 sq ft (expandable to 50,000) manufacturing HQ; relocated from Vero Beach in 2019. |
| Triton Submarines – European support facility | Spain | Barcelona | Triton Submarines LLC | submersible service | | | | | | service, refit, repair | | tritonsubs.com | European service hub; company also dispatches technicians worldwide (e.g. Maldives, Monaco). |
| U-Boat Worx – Breda HQ/factory | Netherlands | Breda | U-Boat Worx B.V. | submersible builder | | | | | | newbuild, service, refit, repair, certification | 2005 | uboatworx.com | ~4,000 m² production area; builds C-Explorer and NEMO lines in-house. |
| Sub Center Curaçao (U-Boat Worx) | Curaçao (NL) | Willemstad | U-Boat Worx B.V. | submersible service | | | | | | service, training, certification | | subcentercuracao.com | World's first dedicated submersible pilot training center; co-located with Substation Curaçao / Curasub. |
| SEAmagine Hydrospace Corporation | USA | Upland, CA | SEAmagine Hydrospace Corp. | submersible builder | | | | | | newbuild, service, refit | ~1995 | seamagine.com | Builds Aurora-series 2–9 person submersibles for superyachts, film and science; 12,000+ dives, no reported losses. |
| Hawkes Ocean Technologies (DeepFlight) | USA | San Francisco Bay Area, CA | Hawkes Ocean Technologies | submersible builder | | | | | | newbuild | 1996 | | Builder of winged DeepFlight Super Falcon/Dragon/Challenger personal submersibles; current operating status of the manufacturer not confirmed in this pass. |
| SubSea Craft | UK | Portsmouth (The Camber) | SubSea Craft Ltd | submersible builder | | | | | | newbuild, service | | subseacraft.com | Builds the Victa diver-delivery/special-forces submersible craft, not a leisure sub; integrated design/prototyping/production site, plus a Trials, Testing & Training station in Portland, Dorset. |
| Aquatica Submarines | Canada | West Vancouver, BC | Aquatica Submarines Inc. | submersible builder | | | | | | newbuild, service | | aquaticasubmarines.com | Builds the Stingray 500 (3-person, DNV-GL classed to ~210 m); leasing/sales model, offices also in North Vancouver/Calgary. |
| Migaloo Submarines | Austria | Vienna | Migaloo Private Submarines | submersible builder | | | | | | newbuild | | migaloo-submarines.com | Concept-stage only (M5, ~166 m submersible superyacht); no shipyard, prototype or confirmed buyer exists as of this research pass. |
| NEMO production line (U-Boat Worx) | Netherlands | Breda | U-Boat Worx B.V. | submersible builder | | | | | | newbuild, service | | uboatworx.com / nemo-submarine.com | Volume-production line for NEMO 1/2 one- and two-person subs at the same Breda facility as C-Explorer models. |

## Tourist/research submarine support

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Atlantis Adventures Maintenance Facility, Pier 27 | USA | Honolulu, HI | Atlantis Adventures / Atlantis Submarines | submersible service | | | | | | service, refit, repair | 1985 | atlantissubmarines.com | Dedicated shore maintenance facility for the Hawaii tourist-submarine fleet (Oahu, Maui, Big Island). |
| Atlantis Submarines Barbados | Barbados | Bridgetown | Atlantis Adventures | submersible service | | | | | | service, repair | | atlantissubmarines.com | Caribbean tourist-submarine operation and local support base. |
| Atlantis Submarines Cozumel | Mexico | Cozumel | Atlantis Adventures | submersible service | | | | | | service, repair | | atlantissubmarines.com | Caribbean/Gulf tourist-submarine operation and local support base. |
| Atlantis Submarines Aruba | Aruba (NL) | Oranjestad | Atlantis Adventures | submersible service | | | | | | service, repair | | atlantissubmarines.com | Caribbean tourist-submarine operation and local support base. |
| Substation Curaçao (Curasub) | Curaçao (NL) | Willemstad | Substation Curaçao | submersible service | | | | | | service, research support | | substation-curacao.com | Home base of the Curasub research/tourism submersible; shares site with Sub Center Curaçao. |
| Mobimar Ltd | Finland | Turku | Mobimar Ltd | submersible builder | | | | | | newbuild, service, refit | | mobimar.com | Built roughly half of the world's 30+ tourist submarines (Mark II–Mark V series), sold to operators globally (Lanzarote, China, Egypt, etc.). |
| International Venturecraft Corp. (IVC) | Canada | Burnaby, BC | International Venturecraft Corp. | submersible builder | | | | | | newbuild, service | | | Builds SportSub/ResortSub/TourSub ambient-pressure tourist and yacht-tender submersibles. |
| WHOI National Deep Submergence Facility (Alvin support) | USA | Woods Hole, MA | Woods Hole Oceanographic Institution (for US Navy/NSF) | submersible service | | | | | | service, refit, repair, certification | 1964 | whoi.edu | Alvin undergoes full disassembly/overhaul roughly every 5 years; re-certified by US Navy DSP after each overhaul (most recent June 2026). |
| Ifremer Nautile support base | France | La Seyne-sur-Mer (Toulon) | Ifremer | submersible service | | | | | | service, refit, repair | 1985 | ifremer.fr | Ifremer's underwater-systems department; Nautile renovations carried out entirely at this site, activity extended through 2035. |
| JAMSTEC Shinkai 6500 support (R/V Yokosuka) | Japan | Yokosuka | JAMSTEC | submersible service | | | | | | service, repair | 1989 | jamstec.go.jp | Onboard hangar (9 x 2 x 3 m) aboard support ship Yokosuka houses/repairs Shinkai 6500 between dives; JAMSTEC HQ also in Yokosuka. |

## Naval submarine dry docks

| Shipyard | Country | City | Operator | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pearl Harbor Naval Shipyard & IMF | USA | Pearl Harbor, HI | US Navy (NAVSEA) | submarine dry dock | | | | Dry Dock 5 (new): ~200 m long | graving dry dock | service, refit, repair | 1908 | navsea.navy.mil | New Dry Dock 5 ($3.42B, under construction, due 2027) sized for Virginia-class; legacy Dry Dock 3 too small for current classes. |
| Portsmouth Naval Shipyard | USA | Kittery, ME | US Navy (NAVSEA) | submarine dry dock | | | | | graving dry dock | service, refit, repair | 1800 | navsea.navy.mil | $1.73B Dry Dock 1 expansion project to hold up to 5 Los Angeles/Virginia-class boats simultaneously. |
| Norfolk Naval Shipyard | USA | Portsmouth, VA | US Navy (NAVSEA) | submarine dry dock | | | | Dry Dock 8: 335 x 45.7 x 16.8 m; Dry Dock 4: ~308 x 43.9 x 12.2 m | graving dry dock | service, refit, repair | | navsea.navy.mil | Dry Dock 4 used today to overhaul submarines; Dry Dock 8 handles carriers and larger work (Nimitz-class capable). CURATION FIX (TASK-016 review carry-forward): the Max Tonnage cell previously read "Nimitz-class capable (Dry Dock 8)" — prose, not a number — which parsed as tonnage=8; blanked per the "never guess" rule and moved into this Notes cell instead. |
| Puget Sound Naval Shipyard & IMF | USA | Bremerton, WA | US Navy (NAVSEA) | submarine dry dock | | | | | graving dry dock | service, refit, repair | 1891 | navsea.navy.mil | One of the Navy's four public shipyards handling nuclear submarine maintenance; part of Shipyard Infrastructure Optimization Program. |
| General Dynamics Electric Boat – Groton | USA | Groton, CT | General Dynamics Electric Boat | submarine dry dock | | | | Floating dry dock "Atlas": 188 x 42.7 m, 27.4 m tall | floating dry dock + graving dock/pontoon | newbuild, service, refit | 1899 | gdeb.com | New floating dry dock Atlas (2026) supports Columbia-class final assembly/float-off at the South Yard. |
| Devonport Royal Dockyard | UK | Plymouth | Babcock International | submarine dry dock | | | | | graving dry dock | service, refit, repair | | babcockinternational.com | UK's submarine maintenance/refit yard (Babcock); does not build new submarines. |
| BAE Systems Submarines – Devonshire Dock Hall | UK | Barrow-in-Furness | BAE Systems | submarine dry dock | | | | Hall: 260 x 58 m, 51 m tall | covered construction hall/shiplift | newbuild | 1871 | baesystems.com | Builds Astute- and Dreadnought-class submarines indoors; hall being extended for SSN-AUKUS work. |
| Naval Group – Cherbourg | France | Cherbourg-en-Cotentin | Naval Group | submarine dry dock | | | | | graving dry dock (Cachin dock) | newbuild, service, refit, repair | | naval-group.com | Historic submarine-only yard since 1898; also used for decommissioning/dismantling (e.g. SSN Perle "transplant" repair). |
| Naval Group / French Navy – Toulon Arsenal | France | Toulon | Naval Group / Marine Nationale | submarine dry dock | 11 (arsenal total) | | | Two largest: 422 x 40 m | graving dry dock (mobile-roofed) | service, refit, repair | | naval-group.com | Missiessy/Malbousquet quays harbour French SSNs; mobile-roofed docks used for nuclear-fuel-related refits. |
| TKMS – Kiel | Germany | Kiel | thyssenkrupp Marine Systems (TKMS) | submarine dry dock | | | | | graving dry dock | newbuild, service, refit | | tkmsgroup.com | Global market leader in non-nuclear submarines; €250m investment announced to expand Kiel capacity. |
| Damen Shiprepair Den Helder / Willemsoord graving dock | Netherlands | Den Helder | Damen / Royal Netherlands Navy | submarine dry dock | 10 (DSDH) + 1 graving dock (Willemsoord) | up to 115 (DSDH general); 110 (Willemsoord graving dock) | | Willemsoord graving dock: 110 x 18.5 x 5.3 m | graving dry dock + floating docks | service, refit, repair | 1923 | damen.com | Willemsoord graving dock offered on special request for long-lead/refit drydock work at NL's main naval base. |
| Fincantieri – Muggiano (La Spezia) | Italy | La Spezia | Fincantieri | submarine dry dock | | | | Max dock capacity: 265 m | graving dry dock | newbuild, service, refit | 1883 | fincantieri.com | Builds Italian Navy U212NFS submarines; integrated with the Riva Trigoso yard. See Curation notes above re: `83_Builder_Shipyards_and_Dry_Docks_Global.md`'s "Fincantieri Yachts Muggiano (La Spezia)" — likely the same broader complex, distinct (megayacht) program, kept as a separate row rather than merged. |
| Saab Kockums – Karlskrona | Sweden | Karlskrona | Saab Kockums AB | submarine dry dock | | | | | graving dry dock | newbuild, service, refit | | saab.com | Building A26-class (Blekinge-class) submarines; sited next to Sweden's main naval base. |
| ASC – Osborne Naval Shipyard | Australia | Osborne, SA | ASC Pty Ltd (ASC-BAE JV for SSN-AUKUS) | submarine dry dock | | | | | construction hall (under expansion) | newbuild, service, refit | 1985 | asc.com.au | Existing yard sustains Collins-class; being expanded (Submarine Construction Yard) to build SSN-AUKUS boats. |
| ASC / Henderson Defence Precinct | Australia | Henderson, WA | ASC Pty Ltd | submarine dry dock | | | | | floating dock/shiplift | service, refit, repair | | asc.com.au | Sustainment site for Collins-class and future Virginia-class/SSN-AUKUS boats; part of AU$12B Henderson investment. |
| Kawasaki Heavy Industries – Kobe Shipyard | Japan | Kobe | Kawasaki Heavy Industries | submarine dry dock | | | | No. 1 Dock (1902, heritage-listed) | graving dry dock | newbuild, service, refit | 1878 | khi.co.jp | Alternates submarine builds with MHI Kobe, roughly one boat every two years per yard. |
| Mitsubishi Heavy Industries – Kobe Shipyard & Machinery Works | Japan | Kobe | Mitsubishi Heavy Industries | submarine dry dock | | | | | graving dry dock | newbuild, service, refit | 1905 | mhi.com | Builds Japanese Navy submarines alongside space/defense systems work. |
| Mazagon Dock Shipbuilders Ltd (MDL) | India | Mumbai | Mazagon Dock Shipbuilders Ltd | submarine dry dock | | | | New workshop: 220 m long (holds up to 5 subs in build) | integrated assembly workshop with built-in graving dock | newbuild, service, refit | | mazagondock.in | Only Indian yard building both destroyers and submarines (Scorpene-class under license, P-75(I) in progress). |
| Naval Dockyard (Visakhapatnam) | India | Visakhapatnam | Indian Navy | submarine dry dock | 3 | | | | graving dry dock | service, refit, repair | | indiannavy.nic.in | Second most important Indian naval dockyard after Mumbai; ~704 acres. |
| Itaguaí Construções Navais (ICN) / PROSUB base | Brazil | Itaguaí | Itaguaí Construções Navais (Odebrecht/Naval Group technology transfer) | submarine dry dock | | | | | shiplift/graving dock | newbuild, service | | naval-group.com | Built for PROSUB (Scorpène-class + Brazil's first nuclear-powered submarine); Naval Group provided technology transfer and infrastructure advice. |
| Sevmash (Severodvinsk) | Russia | Severodvinsk | Sevmash JSC (United Shipbuilding Corporation) | submarine dry dock | | | | | covered/sheltered graving dock | newbuild, service, refit | 1939 | | Russia's only nuclear-submarine builder; described as having the largest sheltered docks in the country. Public information only. |
| Zvezdochka Ship Repair Center | Russia | Severodvinsk | Zvezdochka (United Shipbuilding Corporation) | submarine dry dock | | | | | dry dock (Sukhona dock, being replaced by a new floating dock) | service, refit, repair | | | Handles submarine repair and decommissioning/recycling across the bay from Sevmash. Public information only. |
| Bohai Shipbuilding Heavy Industry Co. (Huludao) | China | Huludao | China State Shipbuilding Corporation | submarine dry dock | 2 (300,000 DWT class) + 1 semi-dock berth (150,000 DWT) + 1 flooding dock (50,000 DWT) | | up to 300,000 DWT (dock class rating) | | graving dry dock + covered building hall | newbuild, service, refit | 1954 | | China's first and only nuclear-submarine shipyard; recent land reclamation has expanded fabrication/assembly capacity. Public information only. |

## Sources

- [Triton Submarines opens new high-tech facility in Sebastian – Indian River Guardian](https://indianriverguardian.com/2019/01/18/triton-submarines-opens-new-high-tech-facility-in-sebastian/)
- [Triton Submarines - Wikipedia](https://en.wikipedia.org/wiki/Triton_Submarines)
- [Service & Support | Triton Submarines](https://tritonsubs.com/support/)
- [Triton Submarines - Global SubDive](https://globalsubdive.com/services/triton-submarines/)
- [U-Boat Worx opens new expanded facility](https://www.uboatworx.com/news/u-boat-worx-opens-new-expanded-facility)
- [U-Boat Worx - Wikipedia](https://en.wikipedia.org/wiki/U-Boat_Worx)
- [About us - U-Boat Worx](https://www.uboatworx.com/about-us)
- [Sub Center Curaçao - U-Boat Worx](https://www.uboatworx.com/photos/sub-center-curacao)
- [About us - Sub Center Curaçao](https://subcentercuracao.com/about-us)
- [SEAmagine Hydrospace Corporation – Contact Us](https://www.seamagine.com/luxury-subs-contacts.html)
- [Seamagine Hydrospace Co-Founder On Submersibles - Forbes](https://www.forbes.com/sites/katturner/2024/03/25/seamagine-hydrospace-co-founder-on-submersibles-50-dives-is-a-tuesday/)
- [DeepFlight Super Falcon - Wikipedia](https://en.wikipedia.org/wiki/DeepFlight_Super_Falcon)
- [Berkeley Engineering: Diving to the edge of darkness](https://engineering.berkeley.edu/news/2013/11/diving-to-the-edge-of-darkness/)
- [SubSea Craft moves operations to the Camber in Portsmouth - Naval News](https://www.navalnews.com/naval-news/2021/03/subsea-craft-moves-operations-to-the-camber-in-portsmouth/)
- [Welcome - SubSea Craft](https://subseacraft.com/)
- [B.C. pioneering undersea business boom - Business in Vancouver](https://www.biv.com/news/technology/bc-pioneering-undersea-business-boom-8246796)
- [West Vancouver Company launches a new line of manned submarines - Newswire](https://www.newswire.ca/news-releases/west-vancouver-company-launches-a-new-line-of-manned-submarines-579932251.html)
- [MIGALOO Submarines - official site](https://www.migaloo-submarines.com/migaloo/)
- [Submersible superyachts for billionaires - CNN](https://www.cnn.com/travel/submersible-superyacht-migaloo)
- [Migaloo aims to disrupt superyacht market - Dezeen](https://www.dezeen.com/2024/02/14/migaloo-m5-luxury-submarine-superyacht/)
- [Atlantis Adventures Maintenance Facility at Pier 27 (Hawaii EA/EIS)](https://files.hawaii.gov/dbedt/erp/EA_EIS_Library/2014-03-23-OA-FEA-Atlantis-Adventures-Maintenance-Facility-at-Pier-27.pdf)
- [Our History | Atlantis Submarines](https://www.atlantissubmarines.com/our-history)
- [Mobimar - Company profile](https://www.mobimar.com/company-profile)
- [Developing the Mark series - Mobimar](https://www.mobimar.com/tourist-submarines/developing-mark-series)
- [International VentureCraft - MarineLink directory](https://directory.marinelink.com/companies/company/international-venturecraft-206019)
- [Human-occupied submersible Alvin certified to return to service - WHOI](https://www.whoi.edu/press-room/news-release/alvin-recertified/)
- [Ifremer : gros plan sur la rénovation du Nautile - Mer et Marine](https://www.meretmarine.com/fr/science-et-environnement/ifremer-gros-plan-sur-la-renovation-du-nautile)
- [Le Nautile... activité prolongée jusqu'en 2035 - France 3](https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/var/toulon/le-nautile-ce-sous-marin-de-l-ifremer-base-dans-le-var-voit-son-activite-prolongee-jusqu-en-2035-3026708.html)
- [YOKOSUKA | JAMSTEC](https://www.jamstec.go.jp/e/about/equipment/ships/yokosuka.html)
- [SHINKAI 6500 | JAMSTEC](https://www.jamstec.go.jp/e/about/equipment/ships/shinkai6500.html)
- [Pearl Harbor Naval Shipyard - Wikipedia](https://en.wikipedia.org/wiki/Pearl_Harbor_Naval_Shipyard)
- [New Dry Dock Project at Pearl Harbor Naval Shipyard - Seapower](https://seapowermagazine.org/new-dry-dock-project-at-pearl-harbor-naval-shipyard-reaches-early-milestone/)
- [Pearl Harbor Naval Shipyard - Hawaii Defense Economy](https://defenseeconomy.hawaii.gov/shipyard/)
- [BAE Systems Submarines - Wikipedia](https://en.wikipedia.org/wiki/BAE_Systems_Submarines)
- [Devonshire Dock Hall - Wikipedia](https://en.wikipedia.org/wiki/Devonshire_Dock_Hall)
- [BAE Systems places contract to extend Submarine construction hall](https://www.baesystems.com/en-uk/article/bae-systems-places-contract-to-extend-submarine-construction-hall)
- [Naval Group - Cherbourg / SSN Perle interview](https://www.naval-group.com/en/interview-ssn-perle-has-arrived-site-cherbourg)
- [Toulon arsenal - Wikipedia](https://en.wikipedia.org/wiki/Toulon_arsenal)
- [TKMS - Your Maritime Powerhouse](https://www.thyssenkrupp.com/en/company/corporate-structure/tkms)
- [ThyssenKrupp Marine Systems, Kiel - Høj Nordic Marine Contractor](https://hojmarine.com/en/referencer/thyssenkrupp-marine-systems-kiel-germany/)
- [Damen Shipyards Den Helder](https://www.damen.com/companies/shiprepair/damen-shipyards-den-helder)
- [Navantia Launches Second Spanish Navy S-80 Submarine - The Defense Post](https://thedefensepost.com/2025/11/19/spain-s80-submarine/)
- [Astillero de Cartagena - Navantia](https://www.navantia.es/en/product/cartagena-shipyard/)
- [FINCANTIERI-MUGGIANO SHIPYARD - TrustedDocks](https://www.trusteddocks.com/shipyards/55068-fincantieri-muggiano-shipyard)
- [Fincantieri - Wikipedia](https://en.wikipedia.org/wiki/Fincantieri)
- [Saab Kockums - Wikipedia](https://en.wikipedia.org/wiki/Saab_Kockums)
- [Karlskrona shipyard - Saab Newsroom](https://www.saab.com/newsroom/stories/2018/may/karlskrona-shipyard---the-greatest-investment-of-swedens-era-as-a-great-power)
- [ASC - Australia's submarine builder and sustainer](https://www.asc.com.au/)
- [Osborne Submarine Construction Yard - Australian Submarine Agency](https://www.asa.gov.au/projects/osborne-submarine-construction-yard)
- [Building SSN-AUKUS: Australia's $30bn Nuclear Submarine Yard at Osborne - Navy Lookout](https://www.navylookout.com/building-ssn-aukus-australias-30bn-nuclear-submarine-yard-at-osborne/)
- [Kawasaki Shipbuilding Corporation - Wikipedia](https://en.wikipedia.org/wiki/Kawasaki_Shipbuilding_Corporation)
- [Kobe Shipyard & Machinery Works | Mitsubishi Heavy Industries](https://www.mhi.com/company/location/kobew)
- [Hanwha Ocean - Wikipedia](https://en.wikipedia.org/wiki/Hanwha_Ocean)
- [Hanwha Ocean becomes first South Korean shipyard to secure U.S. Navy MRO contract - Naval News](https://www.navalnews.com/naval-news/2024/08/hanwha-ocean-becomes-first-south-korean-shipyard-to-secure-u-s-navy-mro-contract/)
- [Hyundai Heavy Industries Co Ltd (HHI) Ulsan - TrustedDocks](https://www.trusteddocks.com/shipyards/6645-hyundai-heavy-industries-co-ltd-hhi-ulsan)
- [Submarines by Mazagon Dock](https://mazagondock.in/English/pages/Submarines)
- [State-of-the-Art Facilities at Mazagon Dock](https://mazagondock.in/English/facilities)
- [Naval Dockyard (Visakhapatnam) - Wikipedia](https://en.wikipedia.org/wiki/Naval_Dockyard_(Visakhapatnam))
- [Key milestones for the Brazilian submarine program celebrated in Itaguaí - Naval Group](https://www.naval-group.com/en/key-milestones-brazilian-submarine-program-celebrated-itaguai)
- [Third Brazilian Scorpène submarine launched - Naval Today](https://www.navaltoday.com/2024/03/28/third-brazilian-navys-scorpene-submarine-launched/)
- [Sevmash - Wikipedia](https://en.wikipedia.org/wiki/Sevmash)
- [NF decomm: Severodvinsk shipyards - Zvezdochka and Sevmash - Bellona.org](https://bellona.org/news/nuclear-issues/russian-navy/2003-02-nf-decomm-severodvinsk-shipyards-zvezdochka-and-sevmash)
- [Bohai Shipyard - Wikipedia](https://en.wikipedia.org/wiki/Bohai_Shipyard)
- [The Nuclear Submarine Building Capacity of China's Bohai Shipyard - ORF](https://www.orfonline.org/research/the-nuclear-submarine-building-capacity-of-china-s-bohai-shipyard)
- [Electric Boat receives new floating dry dock to support Columbia-class submarines - Naval News](https://www.navalnews.com/naval-news/2026/01/electric-boat-receives-new-floating-dry-dock-to-support-columbia-class-submarines/)
- [General Dynamics Electric Boat - Locations](https://www.gdeb.com/about/locations/groton/)
- [Portsmouth Naval Shipyard - Wikipedia](https://en.wikipedia.org/wiki/Portsmouth_Naval_Shipyard)
- [Norfolk Naval Shipyard breaks ground for $200 million dry dock renovations](https://www.13newsnow.com/article/news/local/mycity/portsmouth/norfolk-naval-shipyard-to-break-ground-for-200-million-dry-dock-renovations/291-95ac6cd8-3288-4590-9f02-4fdfe6faa167)
- [Dry Dock #8 | Keller North America](https://www.keller-na.com/projects/dry-dock-8)

## Coverage notes

- **Strongest tier**: personal/luxury submersible builders (Tier 1) — Triton
  and U-Boat Worx have well-documented, named facilities with size figures;
  most naval yards (Tier 3) have solid location/operator data but sparse
  public dry-dock dimensions, since navies rarely publish precise graving-dock
  geometry for submarine berths.
- **Weakest data**: Russia (Sevmash/Zvezdochka) and China (Bohai/Huludao) —
  intentionally limited to widely republished open-source figures (dock
  count, DWT class); no dimensions, tonnage limits, or official websites were
  claimed beyond what is already public via Wikipedia/OSINT (e.g. H I Sutton's
  Covert Shores). Also weak: exact "Founded" years for Aquatica Submarines,
  SubSea Craft, Migaloo, International Venturecraft, Naval Dockyard
  Visakhapatnam, Itaguaí ICN, and Zvezdochka — left blank rather than guessed.
  Newport News, Devonport, TKMS Kiel, Toulon, Karlskrona, Osborne, Henderson,
  Ulsan, and Mazagon Dock lack public per-dock dimension figures for their
  submarine-specific berths (only overall yard/hall figures were available in
  some cases).
- **Notable finds**: Triton's dedicated European support facility in
  Barcelona (distinct from its Florida factory) directly supports the
  superyacht/submersible-carrier use case DataYacht cares about; U-Boat Worx's
  Sub Center Curaçao doubles as the world's first submersible pilot-training
  center and shares a site with the independent Curasub research/tourism
  operation; Migaloo remains concept-only with no real facility, which is
  itself a useful negative data point for the graph (don't model it as a
  real shipyard).
- Facility Type, Services, and column vocabulary were applied per the fixed
  enumerations given in the task; all dimension/tonnage figures were
  converted to metric where the source gave imperial units, and left blank
  wherever no public figure was found (no values were estimated or inferred).
- **Curation-pass note:** four of this file's naval yards (Navantia –
  Cartagena, HD Hyundai Heavy Industries – Ulsan, Hanwha Ocean – Okpo, Newport
  News Shipbuilding) are the SAME overall shipyard entity as a row already
  present in another lane's research (independent-refit or
  commercial-drydocks), since these giant state/commercial yards also build
  submarines — see this file's Curation notes above for the specific merges.
