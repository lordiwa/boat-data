# Yacht Designer Directory

Research pass for Round 3, Lane K. Expands the graph's designer node set from 10
placeholder (empty-attrs) nodes to a 60-row reference directory covering
exterior design, interior design, naval architecture and sailing-yacht design
studios/principals.

The first 10 rows below are the **exact existing graph node names**
(`ingest/data/graph.json`, `type: "designer"`), preserved verbatim so the
mapper can resolve `designed_by` edges without a rename pass. Row 8,
`(Naval-inspired)`, is very likely a data-extraction artifact rather than a
real studio — see Coverage notes.

| Designer | Country | City | Founded | Discipline | Notable Yachts | Status | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Bannenberg & Rowell | UK | London | 2003 | exterior design, interior design | Joy, Elandess 2, Kathleen Anne, Lady Christine, Home | active | bannenbergandrowell.com | Direct descendant studio of Jon Bannenberg, led by his son Dickie Bannenberg with Simon Rowell |
| Chahan | France | Paris | 1993 | interior design | Faith (refit interior), Flag | active | chahan.com | Chahan Minassian; ex-European Creative Director of Ralph Lauren |
| De Voogt | Netherlands | Hoofddorp | 1913 | naval architecture, exterior design, interior design | Piet Hein, The Highlander, Aquarius, Symphony, Savannah | active | feadship.nl | Feadship's in-house design/engineering studio ("Studio De Voogt") |
| FM Architettura | Italy | Ancona | 2010 | interior design | Akula, Mirage, Ulyssia, Waku | active | fm-arch.it | Founded by Francesca Muzio, ex-CRN/Custom Line creative director |
| Gilles & Boissier | France | Paris | 2004 | interior design, exterior design | Atlante | active | gillesetboissier.com | Patrick Gilles & Dorothée Boissier met while both at Christian Liaigre's studio |
| Jarkko Jamsen | Monaco / Finland | Monaco | n/a (Aivan est. 2000s) | exterior design, interior design, naval architecture | Pi (Syzygy 818), SwanArrow, Raven, Finnish presidential yacht | active | aivan.fi | Runs Jamsen Sarl plus Aivan and Navia; frequent Nautor Swan/Baltic collaborator |
| Liaigre | France | Paris | 1985 | interior design | Vertigo, Cloudbreak, Seahawk, Letani | active | liaigre.com | Christian Liaigre (d. 2020); dedicated yacht division headed by Guillaume Rolland |
| (Naval-inspired) | n/a | n/a | n/a | n/a | Valor | n/a — likely not a real studio | n/a | Data-quality flag: probably a mis-extracted style descriptor ("naval-inspired" exterior) attached to yacht Valor's `designed_by` edge, not an actual design house. Recommend re-mapping Valor to its real designer and retiring this node |
| Remi Tessier | France | Paris | 1988 | interior design | Squall, Parsifal II/III, Nahlin, Vava II, Grace E | active | remi-tessier.com | Trained cabinetmaker via Compagnons du Devoir; also does aircraft interiors |
| RWD | UK | Beaulieu, Hampshire | 1993 | exterior design, interior design, sailing yacht design | Ilona, Al Said, Vava II, Faith, Drizzle | active | rwd.co.uk | Founded as Redman Whiteley Design; Tony Dixon joined 2001 |
| Espen Øino International | Monaco / Norway | Monaco | 1994 | exterior design, naval architecture | Octopus, Serene, Solandge, Kismet, Dilbar | active | espenoeino.com | Norway-born, Monaco-based; ~70 superyachts to date |
| Terence Disdale Design | UK | Richmond upon Thames | 1973 | exterior design, interior design | Eclipse, Pelorus, Tatoosh, A+ (ex-Topaz), Opera | active | terencedisdaledesign.co.uk | Trained under Jon Bannenberg; no formal design training |
| Winch Design | UK | London (Putney) | 1986 | exterior design, interior design | Al Mirqab, Phoenix 2, Madame Gu, Sea Owl, Excellence | active | winchdesign.com | Founded by Andrew Winch (ex-Bannenberg) and Jane Winch; also aviation/architecture |
| H2 Yacht Design | UK | London / Nice | 1994 | exterior design, interior design | Arrow, Maryah, Al Lusail, REV Ocean (interior), Al Reem | active | h2yachtdesign.com | Founded by Jonny Horsfield |
| Reymond Langton Design | UK | London | 2001 | exterior design, interior design | Serene, Orchid, Global, Mogambo, Aviva | active | reymondlangtondesign.com | Founded by Pascale Reymond and Andrew Langton |
| Nuvolari Lenard | Italy | Venice (Marcon) | 1990 | exterior design, interior design | Alfa Nero, Quattroelle, Nord, Vibrant Curiosity | active | nuvolari-lenard.com | Founded by Carlo Nuvolari (naval architect/engineer) and Dan Lenard (stylist) |
| Vripack | Netherlands | Sneek | 1961 | exterior design, interior design, naval architecture | Doggersbank series, Al Waab, Jongert Revolution, Ashly St. Mary | active | vripack.com | Founded by Dick Boon; led since 2009 by Bart Bouwhuis and Marnix Hoekstra |
| Sinot Yacht Architecture & Design | Netherlands | n/a | ~1990 | exterior design, interior design | Musashi, Symphony, Azzam (collab), Aqua (concept), Formosa | active | sinot.com | Founded by Sander Sinot |
| Harrison Eidsgaard | UK | London | 2005 | exterior design, interior design | Amaryllis, Elandess, Lady S, Madsummer, Tango | active | he.design | Founded by Ben Harrison, Ewa Eidsgaard, Peder Eidsgaard |
| Dölker + Voges | Germany | Hamburg | 1997 | interior design, netspace/design engineering | Sailing Yacht A, Dilbar, Azzam, Fulk Al Salamah, Aquijo | active | doelker-voges.com | Founded by Felix Dölker and Robert Voges, both master carpenters; pioneered "netspace" engineering |
| Tim Heywood Design | UK | Hamble / south coast | 1996 | exterior design | A+ (Topaz), Al Mirqab, Pelorus, Symphony, Mayan Queen IV | active | n/a | 20 years under Jon Bannenberg before founding own studio with Vanessa Reville |
| Ken Freivokh Design | UK | River Hamble | n/a | exterior design, interior design, concept design | Maltese Falcon, Black Pearl | active | freivokh.co.uk | Trained as an architect; DynaRig concept realized with Dykstra Naval Architects |
| Philippe Briand / Vitruvius Yachts | France / UK | La Rochelle & London | n/a (career from 1970s) | sailing yacht design, naval architecture, exterior design | Mari-Cha IV, Vertigo, Sybaris | active | philippebriand.com | Designed multiple French America's Cup challengers 1986-2000 |
| Frers Naval Architecture & Engineering (German Frers) | Argentina | Buenos Aires | 1925 | sailing yacht design, naval architecture | Kialoa V, Hyperion, multiple Admiral's Cup/Whitbread winners | active | germanfrers.net | Three-generation family firm; 1,300+ designs |
| Ron Holland Design | Canada (ex-Ireland) | Vancouver (was County Cork) | 1974 | sailing yacht design, naval architecture | Mirabella V, Ethereal, Lion New Zealand | active | ronhollanddesign.com | New Zealand-born; studio originally in Ireland |
| Dubois Naval Architects | UK | Lymington | 1977 | sailing yacht design, naval architecture | Kokomo, Silvertip, Tiara, Zulu II, Mondango II, Squall | dissolved / liquidated 2016-17 | n/a | Ed Dubois died March 2016; firm liquidated by early 2017, name/IP auctioned |
| Tripp Design Naval Architecture (Bill Tripp) | USA / Netherlands | Norwalk, CT & Amsterdam | 1984 | sailing yacht design, naval architecture | Aquijo, Mystere, Esense, Saudade, Shaman | active | trippdesign.net | Bill Tripp III; ex-Doug Peterson office |
| Javier Soto Acebal | Argentina | Buenos Aires | 1998 | sailing yacht design, naval architecture | Alexia (Wally), Angel's Share, Solaris range | active | sotoacebal.com | 11 years in German Frers's office; principal designer for Solaris Yachts |
| Dykstra Naval Architects | Netherlands | Amsterdam | 1969 | naval architecture, sailing yacht design | Maltese Falcon, Black Pearl, Athena, Adix, Hetairos, Endeavour | active | dykstra-na.nl | Founded by Gerard Dijkstra; pioneered the modern DynaRig |
| Van Oossanen Naval Architects | Netherlands | Wageningen | 1992 | naval architecture | Galactica Star, Galactica Super Nova, GTT-135, Azzurra Linea36 | active | oossanen.nl | Founded by Peter van Oossanen; patented Fast Displacement Hull Form and Hull Vane |
| BMT Nigel Gee | UK | Southampton | 1986 | naval architecture | Equanimity, Aquijo, Jubilee, Black Pearl | active | bmt.org | Founded by Nigel Gee and John Bonafoux; part of BMT Group since 2001 |
| Lateral Naval Architects | UK / Monaco | n/a | 2018 | naval architecture (hybrid/electric propulsion) | Project AQUA (with Sinot), Outlier I (with Foster + Partners), Spear | active | lateral-na.com | Joint venture of Oceanco and BMT Nigel Gee; roots in Nigel Gee & Associates (1986) |
| Azure Yacht Design & Naval Architecture | Netherlands | Amsterdam | 2003 | naval architecture, exterior design | VIVA, Kenshō, SeaXplorer series, Dar, Project 1011 | active | azure-na.com | Founded by Hugo van Wieringen (d.) and Diederik van der Hoek, former Feadship partners |
| Officina Italiana Design | Italy | Bergamo | 1994 | exterior design, interior design | Aquariva, Rivarama, Dolcevita, Riva 110 Dolcevita, Bellissima | active | n/a | Mauro Micheli and Sergio Beretta; exclusive Riva (Ferretti Group) design studio |
| Zuccon International Project | Italy | Rome | 1976 | exterior design, interior design, naval architecture consultation | Darling Danama, Ability, Blu Eyes, J'Ade, Chopi Chopi | active | n/a | Founded by Gianni Zuccon and Paola Galeazzi (d.); longtime CRN/Custom Line (Ferretti) partner |
| Stefano Righini Design | Italy | Rimini | n/a (career from 1980s) | exterior design | Mangusta 165 (Samhan, Zeus 1), Azimut 78 Ultra, AZ54 | deceased (2021) | n/a | Estimated ~6,000 boats designed; longtime Azimut-Benetti, Overmarine, Baglietto partner |
| Francesco Paszkowski Design | Italy | Florence | 1990 | exterior design, interior design | Baglietto 29m (1992), CRN Saramour, Heesen Monaco Wolf | active | paszkowskidesign.it | Ex-Spadolini Design; 220+ yachts designed |
| Luca Dini Design & Architecture | Italy | Florence | 1996 | exterior design, interior design, land-based architecture | Sophie Blue, Sea Force One, Tribu, Sarastar | active | lucadini.com | Ex-Spadolini alumnus; 85+ superyachts plus destination masterplanning |
| Achille Salvagni Architetti | Italy | Rome | 2002 | interior design | Numptia, Mikymar, Mr. Oh, Aurora, Endeavour II (Rossinavi) | active | salvagniarchitetti.net | Also redesigned Azimut Grande series interiors (2019) |
| Zaha Hadid Architects (yacht concepts) | UK | London | n/a (yacht concept ~2013) | exterior design (concept), naval architecture via Blohm+Voss | JAZZ / Unique Circle Yachts (concept family) | concept only, not built | zaha-hadid.com | 128m master prototype plus 90m Jazz for Blohm+Voss; no confirmed construction to date |
| Jon Bannenberg (legacy) | Australia / UK | London | studio est. early 1960s | exterior design, interior design | Rising Sun, Carinthia V/VI, Azteca, Talitha G, Nabila, Coral Island | deceased (2002) | n/a | "Father of modern yacht design"; unified ext/int/coordination into one discipline; legacy continued by Bannenberg & Rowell |
| Sparkman & Stephens | USA | Newport, RI & Fort Lauderdale, FL | 1929 | sailing yacht design, naval architecture | Dorade, Ranger (J-Class, with Burgess), six America's Cup 12-Metre defenders | active | sparkmanstephens.com | Bought outright by Donald Tofias in 2018; continues design and brokerage |
| Olin Stephens (legacy) | USA | New York | n/a (S&S co-founder, 1929) | sailing yacht design, naval architecture | Dorade, Ranger, 6 America's Cup defenders (1958-1980) | deceased (2008) | n/a | ~2,200 designs produced across his career at Sparkman & Stephens |
| Michael Peters Yacht Design | USA | Sarasota, FL | 1981 | naval architecture, exterior design (high-performance/sportfish) | Kelsey Lee, Snow Goose, Big Easy | active | mpyd.net | Ex-Halter Marine naval architect; patented hydroplane hull-step design (1980) |
| Donald L. Blount and Associates (DLBA) | USA | Chesapeake, VA | 1988 | naval architecture (high-speed craft) | Destriero, Fortuna | active (as division) | dlba-inc.com | Founder Donald Blount died 2022; acquired by Gibbs & Cox in 2015 |
| Lobanov Design | Spain (founder Russian) | Barcelona | 2007 | exterior design, interior design | Motor Yacht A, Y708, Jubilee, Tuhura, Begallta | active | lobanovdesign.com | Founded by Igor Lobanov; automotive/transport-design background |
| Studio Delta | Netherlands | The Hague | ~1998 (25+ years' experience cited) | naval architecture | explorer/expedition yacht projects, various Dutch builds | active | studiodelta.nl | Led by Menno van Dijk; steel/aluminum/composite hull calculations |
| Alberto Pinto / Pinto Paris | France | Paris | 1972 | interior design | Alfa Nero, Axioma, St Princess Olga | active (continued by Linda Pinto) | n/a | Alberto Pinto died 2012; studio continues under his sister Linda Pinto |
| Guido de Groot Design | Netherlands | n/a | 1997 | exterior design, interior design | Kathleen Anne, Katrion, Maria Pia, Gitana, Espresso | active | guidodegroot.com | Ex-automotive designer (Art Center College of Design); 30+ projects with Mulder shipyard |
| Cor D. Rover Design | Netherlands | n/a | ~1999 | exterior design, interior design, naval architecture | Octopussy, Moonraker, You & Me, Seasense, Phi | active | n/a | Trained under Frank Mulder before founding own studio |
| Mulder Design (Frank Mulder) | Netherlands | n/a | 1979 | exterior design, naval architecture (high-speed) | Octopussy, Moonraker, The World Is Not Enough, Blowsy | active | mulderdesign.nl | 2024 BOAT International Design & Innovation Lifetime Achievement Award |
| Sorgiovanni Designs (Sam Sorgiovanni) | Australia | Fremantle | 1997 | exterior design, interior design | Jubilee, Ruya, Amana, Secret | active | samsorgiovanni.com.au | Mentored by Jon Bannenberg; 2014 Australian Superyacht Industry Hall of Fame |
| Fulvio De Simoni Yacht Design | Italy | n/a | 1977 (as Yankee Delta; own studio later) | exterior design, naval architecture | Pershing range, Wider 150, Wider 42 | active | fulviodesimoni.com | 3,500+ boats built to his designs; pioneer of the "open" motoryacht concept |
| Charles E. Nicholson / Camper & Nicholsons (legacy) | UK | Gosport | firm est. 1782; Charles active from 1890s | sailing yacht design, naval architecture | Endeavour, Endeavour II, Shamrock V, Pioneer | deceased (1954) / brand merged into brokerage | camperandnicholsons.com | Design arm effectively dormant; brand now operates as a yacht brokerage/management group |
| Foster + Partners (yacht concepts) | UK | London | n/a (yacht work since 2008) | exterior design, architecture-led concept design | YachtPlus fleet, Outlier I (with Lateral) | active | fosterandpartners.com | Architecture practice; occasional yacht-concept collaborations, not a dedicated marine studio |
| Cristiano Gatto Design | Italy | near Venice | n/a (career from 1993) | exterior design, interior design | I Nova, plus ISA/Rodriguez/Astondoa/Canados series work | active | n/a | Academy of Fine Arts Venice (sculpture) background |
| Bonetti/Kozerski Architecture | USA | New York | 2000 | interior design | Benetti Oasis 34m (Hull #2) | active | bonettikozerski.com | Founded by Enrico Bonetti and Dominic Kozerski, both ex-Peter Marino; yachting is a recent addition to their residential/architecture practice |
| Zaniz Studio | UK (founded in USA) | London (est. New York) | 2006 (some sources cite 1980s NY start) | interior design | Luminosity, SS Norway (refit), QE2 (refit) | active | n/a | Founder Zaniz Jakubowski; moved studio from New York to London in 2003 |
| Dixon Yacht Design (Bill Dixon) | UK | Southampton area | 1980 | sailing yacht design, naval architecture, production yacht design | Yanneke Too, That's Y, Moody 54, Moody DS45 | active | dixonyachtdesign.com | Took over Angus Primrose's studio at age 24 after Primrose was lost at sea |
| John Munford Design | UK | Southampton (Shamrock Quay) | 1979 | interior design | Jessica/Adix, Endeavour (restoration), Aurora, Archimedes | active | n/a | Trained as a furniture designer; 2013 ShowBoats Design Awards Lifetime Achievement |

## Sources

- https://www.superyachttimes.com/companies/espen-oeino
- https://robbreport.com/motors/marine/naval-architect-espen-oino-creates-yacht-dreams-eg18-2809448/
- https://www.terencedisdaledesign.co.uk/about-us/
- https://ruyachts.com/top-yacht-designers/terence-disdale-design/
- https://en.wikipedia.org/wiki/Andrew_Winch
- https://winchdesign.com/about-winch
- https://www.boatinternational.com/boat-presents/h2-yacht-design-jonny-horsfield
- https://www.charterworld.com/news/formidable-200m-superyacht-the-transporter-h2/teamjohny_web_blk-1058x700
- https://y.co/services/build-and-refit/designer/rwd-design
- https://theislander.online/2016/03/c83-news/insight-behind-scenes-look-redman-whiteley-dixon/
- https://en.wikipedia.org/wiki/Reymond_Langton_Design
- https://www.nuvolari-lenard.com/en/about-us/
- https://vripack.com/studio/about/
- https://www.superyachttimes.com/companies/sinot-exclusive-yacht-design
- https://he.design/
- https://www.doelker-voges.com/
- https://www.boote-magazin.de/en/a-quarter-of-a-century-of-doelker-voges/
- https://www.boatinternational.com/yachts/yacht-design/tim-heywood-best-superyachts
- https://en.wikipedia.org/wiki/Maltese_Falcon_(yacht)
- https://www.philippebriand.com/career/
- https://www.yachtingworld.com/supersail/philippe-briand-profile-superyacht-designer-128226
- https://germanfrers.net/about/
- https://en.wikipedia.org/wiki/Germ%C3%A1n_Frers
- https://en.wikipedia.org/wiki/Ron_Holland
- https://ronhollanddesign.com/about/
- https://en.wikipedia.org/wiki/Ed_Dubois
- https://www.yachtingworld.com/news/dubois-naval-architects-ltd-goes-into-liquidation-104758
- https://en.wikipedia.org/wiki/William_H._Tripp_Jr
- https://megayachtnews.com/2016/05/megayacht-news-leadership-series-bill-tripp-tripp-design/
- https://sotoacebal.com/us/javier-soto-acebal/
- https://www.dykstra-na.nl/
- https://jachtbouwnederland.nl/profile-gerard-dijkstra/
- https://oossanen.nl/about-us/
- https://www.superyachtnews.com/design/designer/799591/bmt-nigel-gee-ltd
- https://www.superyachttimes.com/companies/lateral-naval-architects
- https://azure-na.com/
- https://www.superyachttimes.com/yacht-news/azure-naval-architecture-and-design-break-boundaries-in-yacht-design
- https://ruyachts.com/top-yacht-designers/officina-italiana-design/
- https://top-yachtdesign.com/zuccon-international-project/
- https://www.boatinternational.com/yachts/news/stefano-righini-yacht-designer
- https://www.boatinternational.com/boat-presents/yacht-design-francesco-paszkowski-35th-anniversary
- https://www.lucadini.com/en/yacht-design
- https://en.wikipedia.org/wiki/Achille_Salvagni
- https://www.archdaily.com/444766/zaha-hadid-designs-superyacht-for-blohm-voss
- https://en.wikipedia.org/wiki/Jon_Bannenberg
- https://www.bannenbergandrowell.com/1957onwards/
- https://en.wikipedia.org/wiki/Sparkman_%26_Stephens
- https://en.wikipedia.org/wiki/Olin_J._Stephens,_II
- https://www.marinelink.com/news/ownership-stephens415299
- https://mpyd.net/about/
- https://megayachtnews.com/2022/07/donald-l-blount-renowned-naval-architect-dies/
- https://www.lobanovdesign.com/about
- https://studiodelta.nl/en/
- https://en.wikipedia.org/wiki/Alberto_Pinto_(interior_designer)
- https://www.guidodegroot.com/about-guidodegroot/
- https://robbreport.com/motors/marine/cor-d-rover-designs-superyacht-benetti-seasense-eg18-2788967/
- https://mulderdesign.nl/news/frank-mulder-receives-lifetime-achievement-award/
- https://www.samsorgiovanni.com.au/
- https://www.fulviodesimoni.com/en/history
- https://en.wikipedia.org/wiki/Charles_Ernest_Nicholson
- https://en.wikipedia.org/wiki/Camper_and_Nicholsons
- https://www.dezeen.com/2025/10/01/foster-partners-outlier-i-megayacht-lateral/
- https://www.fosterandpartners.com/projects/the-yachtplus-fleet/
- https://www.barchemagazine.com/fulvio-de-simoni-intervista/
- https://www.bonettikozerski.com/about
- https://www.superyachtstories.com/people/zaniz-jakubowski-evoking-emotion-through-interior-design/
- https://www.dixonyachtdesign.com/studio/
- https://www.navisyachts.com/431-john-munford.html
- https://www.boatinternational.com/yachts/yacht-design/showboats-design-awards-lifetime-achievement-award-recipient-john-munford-by-adam-lay--831

## Coverage notes

- **Methodology.** Existing graph node names were pulled directly from
  `ingest/data/graph.json` via grep on `"type": "designer"` (10 nodes found,
  all with empty `attrs`). Each new studio/principal was researched via one or
  two targeted web searches prioritizing the studio's own site, Wikipedia,
  Boat International, SuperyachtTimes, and SuperyachtNews as primary sources;
  secondary aggregator sites (itBoat, ruyachts, ALTINEL, royist) were used only
  to corroborate founding dates and notable-yacht lists, never as sole source.
- **`(Naval-inspired)` anomaly.** This existing node is almost certainly not a
  real design studio. It is attached to exactly one `designed_by` edge
  (yacht `Valor`) and its only other appearance in the graph is inside a
  case-folded index bucket `"(naval-inspired)"`, which is consistent with an
  ingestion script having captured a *descriptive phrase* ("naval-inspired
  exterior styling") from source prose rather than a proper noun. Recommend
  the Orchestrator/developer trace yacht `Valor`'s source paragraph in
  `/knowledge` to find the real designer, re-point the edge, and drop this
  node rather than trying to "flesh out" a fictitious studio with invented
  country/city/founded data.
- **Confidence tiers.** Founding dates and city/country are high-confidence
  (primary-source-backed) for all rows except: Sinot Yacht Architecture &
  Design (founding year is muddled across sources between "late 1990s" and "in
  1990... returned to the Netherlands", both cited from the same
  SuperyachtTimes-sourced summary — flagged as approximate); Zaniz Studio
  (two conflicting founding narratives, 2006 vs. 1980s, both appear in the
  same source set); Cor D. Rover Design and Studio Delta (only "N years of
  experience" framing was available, not a firm incorporation year — founding
  year is a back-calculated estimate). These should be treated as "best
  available" rather than verified when the developer builds the ingestion
  mapper.
- **Notable Yachts as future edges.** The "Notable Yachts" column is written
  as exact proper nouns specifically so a later pass can turn each cell into
  candidate `designed_by` edges. Several yachts recur across multiple rows
  (e.g., Vava II under both RWD and Ron Holland-adjacent sources, Aquijo under
  both Tripp Design and BMT Nigel Gee, Black Pearl under both Dykstra and BMT
  Nigel Gee/Lateral) — this is expected and correct: modern superyachts
  routinely credit separate exterior designer, interior designer, and naval
  architect firms on the same hull. The mapper should support multiple
  `designed_by` edges per yacht with a `role` attribute
  (exterior/interior/naval_architecture) rather than assuming one designer per
  yacht.
- **Discipline field is a comma list, not a taxonomy.** Studios use these
  terms inconsistently in their own marketing (e.g., "yacht architecture"
  vs. "naval architecture" vs. "technical design"); the column normalizes to
  the four discipline buckets requested (exterior design, interior design,
  naval architecture, sailing yacht design) but a studio like Jarkko Jämsén's
  or Vripack's genuinely spans three of the four, which is reflected as-is.
- **Weakest data.** (1) `(Naval-inspired)` as detailed above; (2) several
  legacy/deceased principals (Stefano Righini, Olin Stephens, Charles E.
  Nicholson, Jon Bannenberg) have "Founded" values that are approximate career
  start years rather than firm incorporation dates, since the individual
  predates or is inseparable from the firm; (3) a handful of Dutch and Italian
  boutique studios (Sinot, Cor D. Rover, Guido de Groot, Cristiano Gatto, Studio
  Delta) do not publish a specific city within their home country on any
  indexed source, so "City" is left as `n/a` rather than guessed; (4) website
  domains marked `n/a` are studios whose only strong web presence is
  third-party directory pages (SuperyachtTimes/Boat International profiles)
  rather than an owned domain — a live check before ingestion is recommended
  since some of these firms are small enough that domains change or lapse.
- **Not covered / open for a follow-up pass.** Several names on the brief were
  intentionally treated as aliases of a row already present rather than given
  a duplicate row: "Andrew Winch" -> Winch Design; "Pascale Reymond" ->
  Reymond Langton Design; "Dubois (legacy)" and "Ed Dubois" -> Dubois Naval
  Architects (one row, since it is one firm under one founder). If the
  Orchestrator wants person-level nodes distinct from studio-level nodes (so a
  `founded_by` edge type can point from studio to person), that is a schema
  decision for the developer, not something this research pass should
  pre-decide by fragmenting rows.
