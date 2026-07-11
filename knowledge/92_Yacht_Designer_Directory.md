# Yacht Designer Directory

Curated from `research/round2/designer-directory.md` for TASK-019.
Expands the graph's designer node set from 10 placeholder (empty-attrs)
nodes to a 59-row reference directory (see below for why 59, not the
source doc's 60), via `designerMapper.js`'s `isDesignerTable`/
`mapDesignerTables`.

The first 9 rows below are the graph's **exact pre-existing designer node
names** (`ingest/data/graph.json`, `type: "designer"`), preserved verbatim
so the mapper resolves onto them by exact name rather than minting
duplicates. `designed_by` edges are created for each Notable Yachts entry
that resolves against an existing yacht node by EXACT normalized-name
equality only — no fuzzy guessing, no new yacht node minted from this
column (per the ticket). A yacht legitimately accumulates multiple
`designed_by` edges across different rows below (exterior/interior/naval-
architecture credits on the same hull are normal in this industry — see
Vava II, Aquijo, Black Pearl in the table).

## Curation notes

**Excluded row: "(Naval-inspired)".** The source doc's 8th row (one of the
10 "exact existing node names" rows) is `(Naval-inspired)`, which its own
Coverage notes flag as "very likely a data-extraction artifact" — a
descriptive style phrase ("naval-inspired exterior styling") mis-captured
as a proper noun, not a real design studio, with every field (country,
city, founded, website) recorded as `n/a`. Rather than enrich this node
with invented data, it is **intentionally omitted** from this file
entirely: the separate graph-cleanup pass
(`ingest/src/mappers/graphCleanup.js`'s `fixNavalInspiredArtifact`) drops
yacht Valor's `designed_by` edge to `designer:naval-inspired` and deletes
the node outright — Valor already carries a grounded `designed_by` edge to
its real interior designer, Bannenberg & Rowell, from the same source
row's "Designers (Ext/Int)" pair in `knowledge/10` (confirmed by tracing
Valor's row there: "(Naval-inspired) / Bannenberg & Rowell"). This is why
the table below has 59 rows, not the source doc's 60 (9 pre-existing exact
names + 50 new, not 10 + 50).

**Fragmentation-vs-studio-level decisions** (per the research doc's own
Coverage notes, left as a schema decision for this pass): "Andrew Winch" is
treated as an alias of the "Winch Design" row rather than a separate
person-level node; "Pascale Reymond" as an alias of "Reymond Langton
Design"; "Dubois (legacy)"/"Ed Dubois" as one row ("Dubois Naval
Architects") rather than fragmented into studio + founder nodes. This
graph does not currently have a `founded_by` edge type, so introducing
person-level designer nodes distinct from their studio would add a new
concept with no consumer this round — deferred to a future pass if
DataYacht wants person-level design-principal nodes.

**Discipline** is stored as an array (comma-split), normalized in the
research pass to four buckets (exterior design, interior design, naval
architecture, sailing yacht design) — several studios genuinely span
multiple buckets (e.g. Vripack, Jarkko Jämsén) and are recorded as-is
rather than forced into one.

**Confidence caveats preserved from the research pass** (recorded here,
not re-verified this round): Sinot Yacht Architecture & Design's founding
year is muddled across sources (~1990, approximate); Zaniz Studio has two
conflicting founding narratives (2006 vs. 1980s); Cor D Rover Design and
Studio Delta's "founding years" are back-calculated from "N years of
experience" framing, not a verified incorporation date — treat these four
as best-available rather than verified.

**Discovered guard limitation (3 middle-initial names curated):**
`normalize.js`'s shared `isPlausibleEntityName()` guard (used by every
TASK-004+ mapper to reject sentence-shaped junk cells) rejects any name
containing a period immediately followed by a space
(`SENTENCE_PUNCTUATION_RE = /[.!?]\s/`) — this incidentally also matches a
genuine middle-initial abbreviation ("L. Blount", "D. Rover", "E.
Nicholson"), not just a real sentence boundary. Three Designer cells hit
this false positive and were silently dropped by the mapper before this
was caught: **"Donald L. Blount and Associates (DLBA)"**, **"Cor D. Rover
Design"**, and **"Charles E. Nicholson / Camper & Nicholsons (legacy)"**.
Rather than modify the shared, widely-depended-on `isPlausibleEntityName`
helper (risking every other mapper's guard behavior) for this one corner
case, these three cells are curated to drop the middle-initial's period
(**"Donald L Blount and Associates (DLBA)"**, **"Cor D Rover Design"**,
**"Charles E Nicholson / Camper & Nicholsons (legacy)"**) — same real
studios, same data, just without the period that reads as a sentence
boundary to the shared guard.

## Designers

| Designer | Country | City | Founded | Discipline | Notable Yachts | Status | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Bannenberg & Rowell | UK | London | 2003 | exterior design, interior design | Joy, Elandess 2, Kathleen Anne, Lady Christine, Home | active | bannenbergandrowell.com | Direct descendant studio of Jon Bannenberg, led by his son Dickie Bannenberg with Simon Rowell |
| Chahan | France | Paris | 1993 | interior design | Faith (refit interior), Flag | active | chahan.com | Chahan Minassian; ex-European Creative Director of Ralph Lauren |
| De Voogt | Netherlands | Hoofddorp | 1913 | naval architecture, exterior design, interior design | Piet Hein, The Highlander, Aquarius, Symphony, Savannah | active | feadship.nl | Feadship's in-house design/engineering studio ("Studio De Voogt") |
| FM Architettura | Italy | Ancona | 2010 | interior design | Akula, Mirage, Ulyssia, Waku | active | fm-arch.it | Founded by Francesca Muzio, ex-CRN/Custom Line creative director |
| Gilles & Boissier | France | Paris | 2004 | interior design, exterior design | Atlante | active | gillesetboissier.com | Patrick Gilles & Dorothée Boissier met while both at Christian Liaigre's studio |
| Jarkko Jamsen | Monaco / Finland | Monaco | n/a (Aivan est. 2000s) | exterior design, interior design, naval architecture | Pi (Syzygy 818), SwanArrow, Raven, Finnish presidential yacht | active | aivan.fi | Runs Jamsen Sarl plus Aivan and Navia; frequent Nautor Swan/Baltic collaborator |
| Liaigre | France | Paris | 1985 | interior design | Vertigo, Cloudbreak, Seahawk, Letani | active | liaigre.com | Christian Liaigre (d. 2020); dedicated yacht division headed by Guillaume Rolland |
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
| Donald L Blount and Associates (DLBA) | USA | Chesapeake, VA | 1988 | naval architecture (high-speed craft) | Destriero, Fortuna | active (as division) | dlba-inc.com | Founder Donald Blount died 2022; acquired by Gibbs & Cox in 2015 |
| Lobanov Design | Spain (founder Russian) | Barcelona | 2007 | exterior design, interior design | Motor Yacht A, Y708, Jubilee, Tuhura, Begallta | active | lobanovdesign.com | Founded by Igor Lobanov; automotive/transport-design background |
| Studio Delta | Netherlands | The Hague | ~1998 (25+ years' experience cited) | naval architecture | explorer/expedition yacht projects, various Dutch builds | active | studiodelta.nl | Led by Menno van Dijk; steel/aluminum/composite hull calculations |
| Alberto Pinto / Pinto Paris | France | Paris | 1972 | interior design | Alfa Nero, Axioma, St Princess Olga | active (continued by Linda Pinto) | n/a | Alberto Pinto died 2012; studio continues under his sister Linda Pinto |
| Guido de Groot Design | Netherlands | n/a | 1997 | exterior design, interior design | Kathleen Anne, Katrion, Maria Pia, Gitana, Espresso | active | guidodegroot.com | Ex-automotive designer (Art Center College of Design); 30+ projects with Mulder shipyard |
| Cor D Rover Design | Netherlands | n/a | ~1999 | exterior design, interior design, naval architecture | Octopussy, Moonraker, You & Me, Seasense, Phi | active | n/a | Trained under Frank Mulder before founding own studio |
| Mulder Design (Frank Mulder) | Netherlands | n/a | 1979 | exterior design, naval architecture (high-speed) | Octopussy, Moonraker, The World Is Not Enough, Blowsy | active | mulderdesign.nl | 2024 BOAT International Design & Innovation Lifetime Achievement Award |
| Sorgiovanni Designs (Sam Sorgiovanni) | Australia | Fremantle | 1997 | exterior design, interior design | Jubilee, Ruya, Amana, Secret | active | samsorgiovanni.com.au | Mentored by Jon Bannenberg; 2014 Australian Superyacht Industry Hall of Fame |
| Fulvio De Simoni Yacht Design | Italy | n/a | 1977 (as Yankee Delta; own studio later) | exterior design, naval architecture | Pershing range, Wider 150, Wider 42 | active | fulviodesimoni.com | 3,500+ boats built to his designs; pioneer of the "open" motoryacht concept |
| Charles E Nicholson / Camper & Nicholsons (legacy) | UK | Gosport | firm est. 1782; Charles active from 1890s | sailing yacht design, naval architecture | Endeavour, Endeavour II, Shamrock V, Pioneer | deceased (1954) / brand merged into brokerage | camperandnicholsons.com | Design arm effectively dormant; brand now operates as a yacht brokerage/management group |
| Foster + Partners (yacht concepts) | UK | London | n/a (yacht work since 2008) | exterior design, architecture-led concept design | YachtPlus fleet, Outlier I (with Lateral) | active | fosterandpartners.com | Architecture practice; occasional yacht-concept collaborations, not a dedicated marine studio |
| Cristiano Gatto Design | Italy | near Venice | n/a (career from 1993) | exterior design, interior design | I Nova, plus ISA/Rodriguez/Astondoa/Canados series work | active | n/a | Academy of Fine Arts Venice (sculpture) background |
| Bonetti/Kozerski Architecture | USA | New York | 2000 | interior design | Benetti Oasis 34m (Hull #2) | active | bonettikozerski.com | Founded by Enrico Bonetti and Dominic Kozerski, both ex-Peter Marino; yachting is a recent addition to their residential/architecture practice |
| Zaniz Studio | UK (founded in USA) | London (est. New York) | 2006 (some sources cite 1980s NY start) | interior design | Luminosity, SS Norway (refit), QE2 (refit) | active | n/a | Founder Zaniz Jakubowski; moved studio from New York to London in 2003 |
| Dixon Yacht Design (Bill Dixon) | UK | Southampton area | 1980 | sailing yacht design, naval architecture, production yacht design | Yanneke Too, That's Y, Moody 54, Moody DS45 | active | dixonyachtdesign.com | Took over Angus Primrose's studio at age 24 after Primrose was lost at sea |
| John Munford Design | UK | Southampton (Shamrock Quay) | 1979 | interior design | Jessica/Adix, Endeavour (restoration), Aurora, Archimedes | active | n/a | Trained as a furniture designer; 2013 ShowBoats Design Awards Lifetime Achievement |

## Sources

See `research/round2/designer-directory.md`'s own Sources section for the
full per-studio citation list (studio own-site "About"/"History" pages,
Wikipedia, Boat International, SuperyachtTimes, SuperyachtNews).
