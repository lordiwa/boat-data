# Marine Propulsion Manufacturers: Global Directory

Curated from `research/round1/engine-manufacturers.md` for TASK-017 Phase 2.
Who makes marine motors — a global manufacturer directory across every
propulsion segment (outboard, inboard diesel/gas, sterndrive, pod drive,
waterjet, electric, ship 2-stroke), with data depth beyond what Wikipedia
carries (OEM relationships, discontinued brands, acquisitions). The existing
graph's 16 `engine` nodes (from the original corpus file 07's Tier/
Manufacturer tier-comparison table) represent BRANDS — this directory feeds
the SAME node type via `engineMapper.js`'s second guard
(`isEngineManufacturerTable`/`mapEngineManufacturerTables`), enriching those
existing nodes and creating new ones for brands not already present.

## Curation notes

Two Brand cells were cleaned up so this table's rows resolve to the SAME
`engine` node the pre-existing file-07 tier table already created, per the
"one brand node" dedup rule (see `88_Mercury_Marine_History_and_Racing_Engines.md`'s
own Curation notes for the fuller Mercury-brand dedup story):

- **"Mercury / Mariner"** → curated to **"Mercury Marine"** (matches the
  existing `engine:mercury-marine` node exactly). The "/ Mariner" badge-brand
  detail and the Kiekhaefer founding story moved into this row's Notes cell.
- **"MTU (Rolls-Royce Power Systems)"** → curated to **"MTU"** (matches the
  existing `engine:mtu` node exactly). The Rolls-Royce Power Systems
  parenthetical moved into this row's Notes cell.

Five further Brand cells were shortened to match a pre-existing engine node
from the original corpus file 07 (whose own Manufacturer column used the
short marketing name, not the "X Marine"/"X (CAT)" form this research draft
used) — each row's Notes cell now records the fuller brand name instead:
**"Yamaha Marine" → "Yamaha"**, **"Honda Marine" → "Honda"**,
**"Suzuki Marine" → "Suzuki"**,
**"Caterpillar Marine (CAT)" → "Caterpillar (CAT)"**,
**"John Deere Marine" → "John Deere"**, **"Scania Marine" → "Scania"**.

One Parent Company cell was corrected for factual currency (not tidiness —
the original text named a FORMER owner as the parent, which would be
misleading as of today's date):

- **Torqeedo**: Parent Company "Deutz AG (2017–2024), acquired by Yamaha
  Motor 2024" → curated to **"Yamaha Motor Co."** (the current owner,
  per Yamaha's completed 2024 acquisition, already stated in this row's own
  Notes). The Deutz AG 2017-2024 ownership window is preserved in Notes.

**Review fix (MEDIUM 1, post-ship):** six further Parent Company cells were
normalized to bare legal/parent names after re-ingest surfaced junk/duplicate
company nodes — `engineMapper.js`'s `isPlausibleParentName()` guard (the same
defensive check as shipyardMapper.js's `isPlausibleOperatorName()`) doesn't
reject a short parenthetical-qualified cell the way it rejects full-sentence
ownership-history prose, so each of these silently minted its own node
instead of resolving to the real parent's existing node:

- **Nissan Marine**: Parent Company "Tohatsu (rebadge program)" → **"Tohatsu"**
  (was minting `company:tohatsu-rebadge-program` — a program, not a company;
  the rebadge-program detail moved to this row's Notes).
- **Seven Marine**: "Volvo Group (Volvo Penta), formerly independent" →
  **"Volvo Group"** (was minting a THIRD distinct node,
  `company:volvo-group-volvo-penta-formerly-independent`, alongside the
  `company:volvo-group` node Volvo Penta/Volvo Penta IPS's own rows already
  create — now all three Volvo-family rows converge on one parent node).
- **Baudouin**: "Weichai Group (acquired 2009)" → **"Weichai Group"** (moved
  the acquisition year to Notes).
- **MerCruiser**: "Brunswick Corporation (Mercury Marine)" →
  **"Brunswick Corporation"** (was minting
  `company:brunswick-corporation-mercury-marine`, a duplicate of the
  `company:brunswick-corporation` node Mercury Marine/Mercury Avator/Mercury
  Zeus's own rows already create).
- **Indmar Marine Engines**: "Correct Craft (via subsidiary Liberty
  Technologies)" → **"Correct Craft"**.
- **PCM (Pleasurecraft Marine Engine Co.)**: "Correct Craft (Liberty
  Technologies)" → **"Correct Craft"** (Indmar's and PCM's Parent Company
  cells previously differed by wording alone — "via subsidiary Liberty
  Technologies" vs. "Liberty Technologies" — minting TWO separate parent
  nodes, `company:correct-craft-via-subsidiary-liberty-technologies` and
  `company:correct-craft-liberty-technologies`, for what is the same real
  parent company; both rows now converge on one `company:correct-craft`
  node, with the Liberty Technologies subsidiary detail preserved in each
  row's own Notes).

Every remaining Parent Company cell that still carries a parenthetical
qualifier (e.g. "Tohatsu Corporation (JV with Brunswick since 1988)", "BRP
(Bombardier Recreational Products)", "MAN SE (TRATON Group)" — the last of
these appears identically on both MAN Engines' and MAN Energy Solutions' rows
and so already converges on one node with no dedup risk) was deliberately
left as researched: each appears only ONCE across this table, so there is no
second row spelling the same real parent differently for it to fail to
converge with — consistent with the reviewer-endorsed precedent that a
parenthetical-qualified name (e.g. TASK-016's "NVL Group (Rheinmetall)") is
acceptable when it isn't narrating history in full-sentence prose and isn't
creating a duplicate.

The **Market structure** and **History highlights** sections stay unclaimed
doc prose this round — `mapEngineManufacturerTables` only claims the
Manufacturers table itself (a different, incompatible column shape). A small,
hand-grounded set of five OEM_SUPPLIES edges (Tohatsu→Mercury Marine, Tohatsu→
Nissan Marine, Tohatsu→Evinrude, Yanmar→John Deere Marine, FPT Industrial→John
Deere Marine) is created by `engineMapper.js`'s `linkEngineOemSupplies()` hook,
each grounded in a specific brand's own Notes cell below (not parsed from the
free "History highlights" prose) — see that function's own code comment for
the exact quoted cell backing each pair.

## Manufacturers

| Brand | Parent Company | Country | Founded | Engine Types | Power Range | Notable Models | Segment | Status | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Mercury Marine | Brunswick Corporation | USA | 1939 | outboard, sterndrive, pod drive | 2.5–600 hp (outboard); Zeus paired to 355–715 hp diesel | Verado, Pro XS, Racing, MerCruiser Bravo | recreational, racing, commercial | active | [mercurymarine.com](https://www.mercurymarine.com) | Also sold as "Mariner" (badge-engineered sister brand, 1974-1999 in the US). Founded by Carl Kiekhaefer 1939 in Cedarburg, WI on rejected mail-order engine stock; sold to Brunswick 1961 for ~$34M; Kiekhaefer split off Kiekhaefer Aeromarine 1970, reacquired by Brunswick 1990 |
| Yamaha | Yamaha Motor Co. | Japan | 1960 | outboard | 2.5–450 hp | F425, F350, SHO series | recreational, commercial | active | [yamahamotor.com](https://www.yamahamotor.com) | Sold under the "Yamaha Marine" brand. First outboard was the P-7 (1960); first 4-stroke line began 1980, F9.9A launched 1984; co-launched first V6 4-stroke (225 hp) with Honda in 2001 |
| Honda | Honda Motor Co. | Japan | 1964 | outboard (4-stroke only) | 2–250 hp | BF250, BF350 | recreational, commercial | active | [marine.honda.com](https://marine.honda.com) | Sold under the "Honda Marine" brand. Only major outboard maker that has never sold a 2-stroke; first 4-stroke powerhead 1964; co-launched first V6 4-stroke with Yamaha 2001 |
| Suzuki | Suzuki Motor Corporation | Japan | 1965 (brand 1977) | outboard | 2.5–350 hp | DF350A, DT/DF series | recreational, commercial | active | [suzukimarine.com](https://www.suzukimarine.com) | Sold under the "Suzuki Marine" brand. Founded by Michio Suzuki 1909 (parent co.); first outboard 1965, "Suzuki Marine" brand adopted 1977 with DT5 export; first 4-stroke (DF9.9/DF15) 1994 |
| Tohatsu | Tohatsu Corporation (JV with Brunswick since 1988) | Japan | 1922 (Takata Motor Research Inst.); first outboard 1956 | outboard | 2.5–140 hp | MFS9.9, M18E | recreational, commercial | active | [tohatsu.co.jp](https://www.tohatsumarine.co.jp) | Builds all Mercury/Mariner 4–30 hp four-strokes (M-series) under the 1988 Tohatsu Marine Corp JV; produces 170,000–180,000 units/yr combined; also supplied Nissan Marine (rebadge) and small Evinrude-branded units 2011+ |
| Nissan Marine | Tohatsu | Japan/USA | 1980s–2010s | outboard | 2.5–140 hp (same as Tohatsu) | ME9.9TLE | recreational | defunct (brand retired; badge-engineered Tohatsu only) | — | Rebadge program (not a corporate subsidiary): all Nissan-branded outboards sold in North America/Australia were rebadged Tohatsus, differing only in decals/cowling color |
| Evinrude | BRP (Bombardier Recreational Products) | USA / Canada | 1907 | outboard | 25–300+ hp (E-TEC/G2 era) | E-TEC, E-TEC G2 | recreational | defunct (BRP wound down production May 27, 2020) | [brp.com](https://www.brp.com) | Founded by Ole Evinrude in Milwaukee; merged with Johnson 1936 to form Outboard Marine Corp (OMC); OMC bankruptcy 2000, BRP bought motor assets (~$350M); BRP cited COVID-19 impact plus prior segment struggles for the 2020 shutdown, ~$134M wind-down cost (Sturtevant, WI plant repurposed) |
| Johnson | Outboard Marine Corp / BRP | USA | 1921–1922 (Johnson brothers, Terre Haute IN roots to 1903/1908) | outboard | up to 235–275 hp (V6/V8 era) | Sea-Horse, V6 235 (1978, most powerful production outboard at launch) | recreational, racing | defunct (phased out by BRP ~2007, pre-dating Evinrude's 2020 exit) | — | Johnson brothers built inboard experimental V-engines 1903–1913 (destroyed by a 1913 tornado) before pivoting to the 1921 "Light Twin" outboard; merged into OMC 1936 alongside Evinrude |
| Selva Marine | Selva S.p.A. | Italy | 1959 (parent automotive-parts business since 1945) | outboard | ~2.5–300 hp | Selva Marine 2-stroke/4-stroke range | recreational | active | [selvamarine.com](https://www.selvamarine.com) | Family business based in Tirano, on the Italian–Swiss border; one of the few remaining independent European outboard builders |
| Parsun | Suzhou Parsun Power Machine Co. | China | 2001 | outboard | 2.5–300 hp | Parsun F-series | recreational | active | [parsunpower.com](https://www.parsunpower.com) | Budget-segment Chinese outboard exporter; growing OEM presence in Western markets |
| Hidea | Hangzhou Hidea Power Machinery Co. | China | — (2000s) | outboard | 2.5–300 hp | Hidea 2-stroke/4-stroke range | recreational | active | [hideaoutboardmotors.com](https://www.hideaoutboardmotors.com) | Second major budget Chinese outboard exporter alongside Parsun; exact founding year not corroborated this pass |
| Cox Marine (Cox Powertrain) | Cox Powertrain Ltd | UK | 2010 (concept work from 2008; idea traces to designer David Cox) | outboard diesel | 300 hp (CXO300, V8) | CXO300 | commercial, military, recreational | active | [coxmarine.com](https://coxmarine.com) | Blank-sheet diesel outboard, ~$200M over a decade+ of development, $130M+ raised; entered full production May 2020; first diesel outboard to set an outright speed record |
| OXE Marine (OXE Diesel) | OXE Marine AB | Sweden | 2012 | outboard diesel | 125, 150, 175, 200, 300 hp | OXE300 (BMW-sourced I6 3.0L turbodiesel), OXE125–200 (I4 2.0L) | commercial, military, recreational | active | [oxemarine.com](https://www.oxemarine.com) | Listed on Nasdaq First North (Sweden) 2017; uses patented belt-drive torque transfer from automotive-derived diesel blocks to a horizontally-mounted powerhead; only diesel outboard maker spanning 150–200 hp; OXE150–200 assembled in Albany, GA (USA); OXE300 assembled in Tczew, Poland |
| Seven Marine | Volvo Group | USA | 2010 | outboard gas (high-hp) | 527–627 hp | Seven Marine 527, 627 | recreational (large center consoles/yachts) | defunct (Volvo Penta ended sales/production Jan 1, 2021) | — | Formerly independent; founded by Rick Davis and sons in Germantown, WI; sold to Volvo Penta (Volvo Group) 2017, production moved to Lexington, TN; Volvo Penta cited its 2050 net-zero strategy (favoring IPS/sterndrive R&D) as the reason for discontinuation; warranty/parts support continued post-shutdown |
| Torqeedo | Yamaha Motor Co. | Germany | 2005 | electric outboard, electric inboard, hybrid | ~1–100 kW+ (Cruise, Deep Blue lines) | Travel, Cruise, Deep Blue | recreational, commercial | active | [torqeedo.com](https://www.torqeedo.com) | Founded by Christoph Ballin and Friedrich Böbel near Munich; first product (Travel) shown at Boot Düsseldorf 2006; was a Deutz AG subsidiary 2017-2024; Yamaha completed acquisition in 2024 and now sells Torqeedo through Yamaha dealer networks |
| ePropulsion | ePropulsion (Shenzhen) | Hong Kong (founded) / China (HQ) | 2012 | electric outboard | ~1–40 kW | Spirit, Navy, E-series | recreational | active | [epropulsion.com](https://www.epropulsion.com) | Founded by Danny Tao and three co-founders from HKUST; uses a direct-drive motor (no gearbox), positioned as lower-cost alternative to Torqeedo |
| Mercury Avator | Brunswick Corporation | USA | 2022 (product line) | electric outboard | 7.5e–35e hp-equivalent range at launch (expanding) | Avator 7.5e, 20e, 35e | recreational | active | [mercurymarine.com](https://www.mercurymarine.com) | Mercury's electric outboard line, positioned to lead the segment on range-per-charge per comparative reviews |
| Flux Marine | Flux Marine, Inc. | USA | 2015 (founded); production-stage 2020s | electric outboard | up to 115 hp-equivalent | Flux 40, Flux 100+ (115 hp) | recreational | active | [fluxmarine.com](https://www.fluxmarine.com) | Founded by Ben Sorkin with Princeton seed funding; co-founders Daylin Frantin and Jon Lord; ~$30M raised, Bristol RI manufacturing facility |
| Elco Motor Yachts | Elco (Electric Launch Company lineage) | USA | 1893 (as Electric Launch Co.); closed 1949; revived 1987 | electric outboard, electric inboard | small–100+ hp-equivalent | Elco EP (inboard), Elco outboards | recreational | active | [elcomotoryachts.com](https://www.elcomotoryachts.com) | Debuted 55 electric launches at the 1893 Chicago World's Fair, carrying 1M+ passengers; parent Electric Boat shifted to submarine contracts and closed Elco in 1949; brand revived 1987 — one of the oldest continuously-traceable names in marine propulsion |
| Waterman ("Porto-Motor") | Cameron Waterman / sold to Arrow Motor & Machine Co. (1917) | USA | 1905 | outboard | ~2 hp | Porto-Motor | recreational | defunct | — | Widely credited (incl. by Mercury founder Carl Kiekhaefer) as the first commercially successful gasoline outboard, predating Evinrude; patent US 851,389 (filed 1905, granted 1907); coined/popularized the term "outboard motor"; ~25,000 units sold by 1914 |
| MTU | Rolls-Royce plc | Germany | 1909 (MTU Friedrichshafen); part of Rolls-Royce Power Systems since 2014 | inboard diesel | Series 2000: to ~2,222 mhp (12V2000, 2026); Series 4000: 1,000–5,766 hp; Series 8000: multi-MW ship power | Series 2000, Series 4000, Series 8000 | yacht, superyacht, commercial, ship | active | [mtu-solutions.com](https://www.mtu-solutions.com) | Formal name "MTU (Rolls-Royce Power Systems)"; Series 2000/4000 launched at SMM Hamburg 1996 — Series 4000 was first with common-rail injection as standard, ahead of automotive adoption; 65,000+ Series 2000 and 52,000+ Series 4000 units shipped; 350+ Series 8000 units in service; new 12V2000 M96Z variant for yachts/patrol/sportfishing announced for 2026 |
| Caterpillar (CAT) | Caterpillar Inc. | USA | 1925 (Caterpillar); marine engines from 1938 | inboard diesel | wide range, incl. C-series and MaK medium-speed to multi-MW | 3512, C32, MaK M 25 | yacht, commercial, ship | active | [cat.com](https://www.cat.com) | Marine division sold as "Caterpillar Marine." Caterpillar formed 1925 from Holt Mfg. + C.L. Best Tractor Co. merger; marine-specific diesel line began 1938; acquired MaK (German medium-speed engine maker) in 1997, now Caterpillar's premium marine/cruise/ferry/offshore brand |
| MAN Engines | MAN SE (TRATON Group) | Germany | MAN diesel lineage from early 1920s; MAN Engines as yacht/marine unit | inboard diesel | D2676 (6-cyl), D2868 (8-cyl), D2862 (12-cyl) — roughly 800–1,900 hp in yacht trims | D2862, D2868, D2676 | yacht, superyacht, commercial | active | [man.eu/engines](https://www.man.eu/engines) | MAN Diesel SE merged with MAN Turbo in 2010 to form MAN Diesel & Turbo (predecessor of today's MAN Energy Solutions for large 2-stroke work; MAN Engines is the separate yacht/genset/commercial-vehicle-derived-engine unit) |
| Volvo Penta | Volvo Group | Sweden | 1907 (Penta name from ~1916; Volvo acquired 1935) | inboard diesel, sterndrive, pod drive | ~130–1,000+ hp (IPS/inboard range) | IPS, D13, D11 | recreational, yacht, commercial | active | [volvopenta.com](https://www.volvopenta.com) | First marine engine (the "B1") from a Skövde foundry, 1907; launched the world's first pod-drive system, IPS, in 2005 (prototype work from 1997) |
| Cummins | Cummins Inc. | USA | 1919 | inboard diesel | ~425–2,600+ hp (QSB–QSK range) | QSB, QSC, QSK, X15 | yacht, commercial | active | [cummins.com](https://www.cummins.com) | Long-running Cummins MerCruiser Diesel (CMD) joint venture with Mercury Marine (Zeus pod integration) was dissolved; each company now runs its diesel/pod business independently |
| Yanmar | Yanmar Holdings | Japan | 1912 | inboard diesel | ~4–1,800 hp | 6LY, 8LV | recreational, yacht, commercial | active | [yanmar.com/marine](https://www.yanmar.com/marine/) | Long-standing engine supply relationship with John Deere (tractor engines from 1977, extending to marine); known for high power-to-weight lightweight diesels favored in sportfish/performance cruising |
| John Deere | Deere & Company | USA | Marine engine line 30+ years old; PowerTech branding from 1996 | inboard diesel | ~90–1,200+ hp (PowerTech range) | PowerTech 6068, 4045 | yacht (auxiliary/genset), commercial | active | [deere.com](https://www.deere.com) | Marine division sold as "John Deere Marine." PowerTech line introduced 1996 to meet Tier 1 emissions; Deere's marine range spans propulsion, auxiliary/genset, and industrial-marine variants; some smaller John Deere diesels are Yanmar- or FPT-sourced |
| FPT Industrial | Iveco Group (spun off from Fiat Powertrain Technologies) | Italy | FPT established 2005 (Fiat Powertrain Technologies) | inboard diesel | ~60–1,000 hp | N67, C13 marine variants | yacht, commercial | active | [fptindustrial.com](https://www.fptindustrial.com) | FPT = Fiat Powertrain Technologies; some smaller John Deere marine diesels are FPT-built under supply agreement |
| Scania | Scania AB (TRATON Group) | Sweden | Scania marine engines derived from truck platform | inboard diesel | ~450–1,150 hp (DI13/DI16) | DI13, DI16 | yacht, commercial | active | [scania.com](https://www.scania.com) | Marine division sold as "Scania Marine." DI13 uses compacted-graphite-iron block construction and common-rail injection; positioned as strong low-end-torque commercial/yacht diesel |
| Baudouin (Moteurs Baudouin) | Weichai Group | France | 1918 | inboard diesel | ~350–2,600 hp | 6M26, 12M26 | yacht, commercial | active (acquired by Weichai) | [baudouin.com](https://baudouin.com) | Acquired by Weichai in 2009. Founded by Charles Baudouin in Marseille (HQ later moved to Cassis); built low-speed diesels for fishing fleets from the outset; Weichai bought the company for $3.8M in 2009 and invested in a new Cassis R&D center; developing LNG/diesel marine engines post-acquisition |
| Weichai Marine | Weichai Holding Group | China | Weichai founded 1946; marine diesel from 1968 (6200 engine for fishing vessels) | inboard diesel | ~100–4,000 hp (WP series) | WP series | commercial, yacht (value segment) | active | [en.weichai.com](https://en.weichai.com) | State-owned Chinese diesel conglomerate; also owns Baudouin (France) as its Western/premium marine brand since 2009 |
| Doosan Engine | Doosan Group | South Korea | — | inboard diesel, 2-stroke ship (licensed builds) | ~300–2,600+ hp (propulsion); larger under license for ship engines | Doosan V222, L series | commercial, ship | active | [tontekpower.com](https://www.tontekpower.com/doosan-marine-propulsion-engine-product/) (distributor) | Described in industry sources as the second-largest marine diesel engine maker after Hyundai Heavy Industries; corporate lineage (Doosan Infracore vs. post-2021 "HD Hyundai Infracore" ownership) not independently confirmed this pass — flagged in Coverage notes |
| Hyundai SeasAll | Hyundai Kia Motors (marine engine subsidiary) | South Korea | 2009 (US market debut 2008 at boat shows) | inboard diesel, sterndrive, waterjet | ~150 hp–1,000+ hp (estimated from range coverage; exact ceiling unconfirmed) | Seasall 270P and range | recreational, commercial | active | [hyundaiseasall.com.au](https://www.hyundaiseasall.com.au) | "SeasAll" = "All of the Oceans"; built on Hyundai's automotive graphite-infused block/piston technology with common-rail injection, marinized specifically (not a straight automotive-to-marine conversion) |
| Nanni Diesel | Nanni Industries | France (founded in Italy) | 1952 | inboard diesel | 10–2,200 hp (engines) + 5–800 kW (gensets) | Nanni N4, N7 (Kubota/Iveco-based marinizations) | recreational, yacht | active | [nannienergy.com](https://nannienergy.com) | Founded in Milan 1952 marinizing Farymann industrial engines; relocated HQ to the Bay of Arcachon, France; self-reported #3 worldwide for inboard engines |
| Beta Marine | Beta Marine Ltd | UK | 1987 | inboard diesel | ~10–150 hp (Kubota-based) | Beta 38, Beta 60 | recreational, yacht (sail auxiliary) | active | [betamarine.co.uk](https://betamarine.co.uk) | Formed by four marine engineers with 70+ combined years' experience; marinizes Kubota industrial base engines in-house near Gloucester, UK; US distribution arm (Beta Marine USA) started 1997 |
| Perkins Engines | Caterpillar Inc. | UK | 1932 | inboard diesel | ~30–2,000 hp (broad historical range across models) | Perkins Sabre, 4.236, 1000-series | recreational, commercial | active (Caterpillar subsidiary since 1998) | [perkins.com](https://www.perkins.com) | One of the most widely marinized diesel blocks in small/mid recreational and workboat use for decades |
| Steyr Motors | Steyr Motors GmbH | Austria | 2001 (independent spin-off); lineage traces to Steyr-Daimler-Puch diesel division | inboard diesel | ~150–320 hp (compact V6/V8) | Steyr Monoblock M16, M18 | yacht, military/commercial | active | [en.wikipedia.org/wiki/Steyr_Motors_GmbH](https://en.wikipedia.org/wiki/Steyr_Motors_GmbH) | Became independent via an internal management buyout from Steyr-Daimler-Puch in 2001 |
| Volkswagen Marine (TDI) | Volkswagen AG | Germany | Marinized ~2008–2019 (production dates vary by model, e.g. Marine TDI 350-8 from Feb. 2009) | inboard diesel, sterndrive | 230–260 hp (3.0L TDI V6) | Mercury Diesel 3.0L TDI (VW-sourced) | recreational | defunct (VW ended supply to Mercury; last availability ~early 2019) | — | Engines marinized/sold via Mercury Diesel; VW built and Mercury marinized/branded the engines under the "Mercury Diesel" name; VW made the unilateral decision to discontinue supplying the automotive-derived TDI block to Mercury |
| Wärtsilä | Wärtsilä Corporation | Finland | 1834 (sawmill origin); diesel engines from 1942 | inboard diesel (medium-speed), 2-stroke ship (via WinGD licensing/services) | Medium-speed to multi-MW; historically largest 2-stroke output class (RT-flex96C, ~87 MW) | Wärtsilä 46, 32, RT-flex | ship, commercial, megayacht (gensets) | active | [wartsila.com](https://www.wartsila.com) | First Wärtsilä-designed diesel (Vasa 14) ran 1959 after a license-built Krupp diesel debuted 1942; holds an estimated ~46% share of the medium-speed marine main-engine market (2023); grew via acquisitions incl. John Crane-Lips (2002), Hamworthy (2012), L-3 Marine Systems (2014); divested its own 2-stroke portfolio into WinGD (2015, fully divested 2016) but remains WinGD's authorized global service partner |
| MAN Energy Solutions | MAN SE (TRATON Group) | Germany | 2-stroke marine engine tech tracing to MAN's early Diesel-engine license (1898) | 2-stroke ship, inboard diesel | Multi-MW (largest 2-stroke class engines in the world) | MAN B&W two-stroke range | ship, commercial | active | [man-es.com](https://www.man-es.com) | Formed via 2010 merger of MAN Diesel SE and MAN Turbo into MAN Diesel & Turbo, later renamed MAN Energy Solutions; among the "big three" (with Wärtsilä and Hyundai Heavy Industries) that hold 45%+ combined marine-diesel-engine market share |
| WinGD (Winterthur Gas & Diesel) | CSSC (China State Shipbuilding Corporation) | Switzerland | 2015 (spun off Wärtsilä's 2-stroke portfolio; fully divested 2016) | 2-stroke ship | Multi-MW | WinGD X-series | ship, commercial | active | [wingd.com](https://wingd.com) | Some WinGD-designed engines are license-built by Mitsui E&S Diesel United (formerly also IHI); Wärtsilä remains an authorized service provider for legacy Wärtsilä/Sulzer/WinGD-branded 2-stroke engines |
| Bergen Engines | Kongsberg Maritime | Norway / UK | Kamewa lineage from 1860 (Karlstad); Rolls-Royce owned 1999–2019 | inboard diesel, waterjet, ship systems | Bergen engines: wide range; Kamewa waterjets 260 kW–36,000 kW (see separate "Kongsberg Kamewa" row) | Bergen engines | ship, commercial, megayacht | active | [kongsberg.com/maritime](https://www.kongsberg.com/maritime) | Formerly branded "Rolls-Royce Commercial Marine"; Kongsberg Gruppen acquired Rolls-Royce's Commercial Marine unit in 2019, becoming Kongsberg Maritime. Kamewa (Sweden) acquired by Vickers plc 1986; Rolls-Royce acquired Vickers 1999. Kamewa waterjet lineage is also covered by the separate "Kongsberg Kamewa" row below — this row's distinct scope is the Bergen engine line. |
| Volvo Penta IPS | Volvo Group | Sweden | 2005 (launch); prototype work from 1997 | pod drive | ~370–1,900 hp-equivalent across IPS models | IPS500–IPS1350 | yacht, commercial | active | [volvopenta.com](https://www.volvopenta.com) | World's first pod-drive propulsion system; forward-facing counter-rotating props (vs. Zeus's rear-facing props behind the leg) |
| Mercury Zeus | Brunswick Corporation | USA | ~2006 (paired to Cummins MerCruiser Diesel engines) | pod drive | paired to 355–715 hp diesel engines | Zeus 3000 series | yacht | defunct / superseded (Zeus branding wound down as CMD joint venture dissolved; Cummins continues own "Zeus" branding independently) | — | Historically paired with Cummins/CMD diesels; direct competitor to Volvo Penta IPS; rear-facing propeller behind the pod leg (vs. IPS's forward-facing props) |
| ZF Marine (POD 4000) | ZF Friedrichshafen AG | Germany | — | pod drive, sterndrive | paired to ~1,600 hp | POD 4000 | yacht, commercial | defunct (POD 4000 discontinued; still found in used-boat listings) | [zf.com/marine](https://www.zf.com) | One of four pod-drive entrants (with Volvo Penta IPS, Cummins/Mercury Zeus, and Caterpillar) in the mid-2000s pod-drive wave |
| HamiltonJet | CWF Hamilton & Co. | New Zealand | 1939 (manufacturing workshop); waterjet product from 1954 | waterjet | wide range, small craft to large ferries/patrol vessels | HM/HT series waterjets | recreational, commercial, ship | active | [hamiltonjet.com](https://www.hamiltonjet.com) | Founded by Sir William "Bill" Hamilton; first jetboat (3.6 m wooden hull, Ford 100E engine + centrifugal pump) completed 1954 to navigate shallow braided NZ rivers where propellers would strike bottom |
| Kongsberg Kamewa | Kongsberg Maritime | Sweden (mfg.) / Norway (parent) | Kamewa lineage from 1860 (Karlstad); waterjet business from ~1980 | waterjet | 260 kW–36,000 kW | Kamewa FF-series (aluminium), Steel Series | ship, commercial, military, recreational | active | [kongsberg.com/maritime](https://www.kongsberg.com/maritime) | First Kamewa waterjet contract 1980 (Hongkong Macau Hydrofoil catamaran ferry Apollo Jet); acquired FF Jet (Finland, aluminium waterjets since 1985) in 1994 under then-owner Vickers plc |
| Arneson Surface Drives | Twin Disc, Inc. | USA | 1980 (product launch; development from mid-late 1970s) | surface drive | paired to high-performance gas/diesel engines (historically 300–2,000+ hp) | Arneson ASD8, ASD14 | recreational, racing | active (under Twin Disc ownership) | [twindisc.com/arneson](https://twindisc.com/arneson/) | Invented by Howard Arneson (also inventor of the automatic pool sweep); prop runs half-in/half-out of the water to cut drag; propelled a 1983 Cougar Cat race boat to 9 straight offshore-racing wins and a world championship |
| France Hélices (SDS) | France Hélices SAS | France | 1977 | surface drive, propellers/shaftlines | for planing hulls 8–40 m, 45+ knots | SDS (Surface Drive System, introduced 1993) | commercial, military, yacht, recreational | active | [surfacedrivesystem.fr](https://www.surfacedrivesystem.fr) | Founded in Cannes by Paul Bezzi; SDS launched 1993; daughter Laetitia Bezzi took over as president in 2014; 3,000+ SDS units delivered over 30 years |
| MerCruiser | Brunswick Corporation | USA | ~1961 (sterndrive line) | sterndrive | ~135–430+ hp (gas) | Bravo One/Two/Three, Alpha | recreational | active | [mercurymarine.com](https://www.mercurymarine.com) | Marketed under Mercury Marine. Took the lead in sterndrives within a year of entering the segment; MerCruiser line later held 80%+ world sterndrive share per company/industry accounts |
| Konrad Marine | Konrad Marine, Inc. | USA | 1991 | sterndrive | performance-oriented, paired to high-hp gas/diesel | Konrad 520, 500-series, ACE | recreational, racing | active | [konradmarine.com](http://www.konradmarine.com) | Started as an aftermarket supplier of Mercury Alpha-compatible sterndrive parts (sold under the "Omega" name); launched its own first full drive (Konrad 520) in 1997; introduced PRS retrofit for discontinued Mercury TRS drives in 2004, ACE drive for racing in 2006 |
| Ilmor Marine | Ilmor Engineering | USA (marine division) / UK (parent) | Ilmor Engineering founded 1983–84; marine racing/production engines from ~2000s, MasterCraft partnership 2010 | inboard gas, sterndrive components | high-performance V8, ~500–1,600 hp | Ilmor MV8, 5.7 GDI | recreational, racing | active | [ilmor.com](https://www.ilmor.com) | Ilmor Engineering founded by Mario Illien and Paul Morgan with Roger Penske/GM backing to build IndyCar turbo engines; marine division applies racing-derived engineering to wakeboard/ski and performance-boat inboards |
| Indmar Marine Engines | Correct Craft | USA | 1971 | inboard gas | ~220–575+ hp (LS-based) | Raptor, Ford-based and GM LS-based inboards | recreational (wake/ski/inboard) | active (acquired by Correct Craft, 2022) | [indmar.com](https://indmar.com) | Held via Correct Craft's Liberty Technologies subsidiary. Founded by Dick Rowe (Marine Corps veteran) in Millington, TN; world's largest privately-held gasoline inboard maker before the 2022 Correct Craft acquisition; first inboard maker with fuel injection and with a catalyzed exhaust (now industry standard) |
| Crusader Engines | Pleasurecraft Engine Group | USA | acquired by Pleasurecraft 1998 | inboard gas | ~320–750 hp | Crusader XR-series | recreational | active | [crusaderengines.com](https://www.crusaderengines.com) | 1998 Pleasurecraft acquisition created the Pleasurecraft Engine Group, described as the world's leading gasoline-inboard manufacturer group |
| PCM (Pleasurecraft Marine Engine Co.) | Correct Craft | USA | — | inboard gas | ~220–500+ hp | PCM Predator, ZZ series | recreational | active | [indmar.com](https://indmar.com) (Liberty Technologies portfolio page) | Held via Correct Craft's Liberty Technologies subsidiary. Now managed alongside Indmar, Crusader, Levitator Engines and Velvet Drive Transmissions under that same subsidiary |

## Market structure

| Segment | Leaders | Challengers | Trend |
|---|---|---|---|
| Recreational outboards | Mercury (Brunswick), Yamaha — the two dominant global brands by volume and horsepower range | Honda, Suzuki, Tohatsu (incl. OEM-supplied Mercury small-hp line); budget Chinese entrants Parsun, Hidea gaining share at the low end | Steady four-stroke consolidation since the 2000s; diesel outboards (Cox, OXE) opening a new commercial/military niche above 150–300 hp; electric outboards (Torqeedo/Yamaha, Mercury Avator, ePropulsion, Flux Marine) fast-growing at the low-kW end but not yet displacing gas at high horsepower |
| Superyacht/yacht diesel (inboard) | MTU (Rolls-Royce Power Systems), Caterpillar (incl. MaK), MAN Engines — the "big three" for large yachts and megayachts | Volvo Penta, Cummins, Yanmar increasingly competitive in the 40–90 ft yacht range; Scania, FPT, Baudouin/Weichai and Doosan expanding in commercial-adjacent and value segments | Emissions tightening (IMO Tier III) driving sustainable-fuel-ready engines (HVO, LNG); Chinese consolidation (Weichai's ownership of Baudouin) pushing budget diesel further upmarket |
| Ship / megayacht 2-stroke | Wärtsilä, MAN Energy Solutions, Hyundai Heavy Industries — collectively 45%+ of the global marine diesel engine market | WinGD (Wärtsilä's own 2-stroke spin-off, now Chinese CSSC-owned), Doosan | Continuing move toward dual-fuel/LNG-ready and ammonia/methanol-ready large 2-strokes for IMO decarbonization targets |
| Drives / pods / waterjets | Volvo Penta IPS (first-mover, still segment reference); Kongsberg Kamewa (waterjets, ship/military scale); HamiltonJet (waterjets, mid-scale/leisure) | Cummins/Mercury Zeus (in flux after the CMD joint-venture split), ZF Marine (POD 4000 discontinued), Arneson/Twin Disc and France Hélices in the surface-drive niche | Pod-drive category matured then partially consolidated (ZF exited, Seven Marine/Volvo Penta outboard exited); waterjets remain the default for fast ferries, patrol, and shallow-draft military craft |
| Sterndrives | MerCruiser (Mercury/Brunswick), Volvo Penta — the two incumbents hold the vast majority of recreational sterndrive share | Konrad Marine, Ilmor MV8 in the high-performance/racing niche | Segment is mature and largely stable; sterndrive volume has ceded some higher-end growth to pod drives and large outboards (e.g., Seven Marine before its 2020 exit) on bigger center-console-style boats |

## History highlights

- Tohatsu, not Mercury, physically builds every Mercury/Mariner four-stroke outboard from 4–30 hp (M-series) under a 1988 Brunswick joint venture — a fact Wikipedia's Mercury and Tohatsu pages both understate. ([Tohatsu Wikipedia](https://en.wikipedia.org/wiki/Tohatsu))
- Every "Nissan Marine" outboard ever sold in North America and Australia was a rebadged Tohatsu, down to nearly identical model numbers (e.g., Nissan ME9.9TLE = Tohatsu MFS9.9E). ([duckboats.net](https://duckboats.net/community/threads/tohatsu-mercury-nissan-evinrude.353520/))
- BRP's 2020 Evinrude shutdown was framed publicly as COVID-19 fallout, but the company's own SEC 6-K filings describe a business "already facing some challenges" before the pandemic — COVID accelerated a wind-down that cost BRP $134M in the nine months to October 2020. ([BRP 6-K, SEC EDGAR](https://www.sec.gov/Archives/edgar/data/1748797/000119312520303029/d31611dex991.htm))
- Johnson (the outboard brand) traces its engineering DNA to 1903 backyard-shed inboard V-engine experiments in Terre Haute, Indiana — a full 18 years before its famous 1921 "Light Twin" outboard debut, and the original records were destroyed in a 1913 tornado. (`knowledge/04_Johnson_and_Evinrude_Motor_History.md`)
- Cameron Waterman's 1905 "Porto-Motor" predates Ole Evinrude's 1907–09 commercial launch and is credited by Mercury founder Carl Kiekhaefer himself as the true first commercially successful outboard — Waterman also coined the term "outboard motor." ([boats.com](https://www.boats.com/on-the-water/howard-arneson-inventor-of-the-arneson-surface-drive/) context via Waterman history search)
- Volvo Penta's IPS pod drive (2005) and Mercury's Zeus system use mirror-image propeller geometry: IPS props face forward, Zeus props sit behind the leg facing aft — the single biggest engineering distinction between the two systems, frequently blurred in consumer coverage. ([powerandmotoryacht.com](https://powerandmotoryacht.com/boats/ips-vs-zeus-which-better/))
- Volvo Penta exited the outboard segment entirely in 2020–21 by discontinuing Seven Marine (bought just three years earlier in 2017), explicitly citing its 2050 net-zero ambitions over further high-hp gas outboard investment. ([Boating Industry](https://boatingindustry.com/news/2020/11/06/volvo-penta-to-stop-the-sales-and-production-of-seven-marine-engines/))
- Weichai Power, a Chinese state-linked engine conglomerate, has quietly owned the storied French diesel brand Moteurs Baudouin (est. 1918) since 2009 — acquired for just $3.8M — while keeping "Baudouin" as its premium Western-facing marine brand. ([Moteurs Baudouin Wikipedia](https://en.wikipedia.org/wiki/Moteurs_Baudouin))
- Volkswagen — not a traditional marine engine house — supplied the 3.0L TDI V6 block that Mercury marinized and sold as "Mercury Diesel"; VW unilaterally ended the supply deal, not Mercury, ending Mercury's factory diesel sterndrive line around 2019.
- Torqeedo, the electric-outboard pioneer (founded 2005, Munich), was owned by German engine maker Deutz AG from 2017 before being fully acquired by Yamaha Motor in 2024 — meaning the world's biggest gas-outboard maker now also owns a leading electric-outboard brand.
- Wärtsilä spun off its own two-stroke ship-engine portfolio into a new joint venture, WinGD, in 2015 (fully divested 2016) — WinGD is now owned by China State Shipbuilding Corporation, and Wärtsilä remains merely WinGD's authorized service partner for legacy Wärtsilä/Sulzer-branded engines.
- Kongsberg Kamewa's waterjet lineage runs through three corporate owners in under 40 years: Kamewa (Sweden, founded 1860) → Vickers plc (1986) → Rolls-Royce (1999, after acquiring Vickers) → Kongsberg Gruppen (2019, buying Rolls-Royce's Commercial Marine division).
- Correct Craft's Liberty Technologies subsidiary now owns essentially the entire US gasoline-inboard supply chain for wake/ski boats: Indmar (acquired 2022), PCM, Crusader, Levitator Engines, and Velvet Drive Transmissions all sit under one roof.
- Perkins Engines (UK, 1932) has been a wholly-owned Caterpillar subsidiary since 1998, making it one of the least-visible "Caterpillar" brands in the recreational marine engine market — most boat buyers don't associate the Perkins name with CAT ownership.
- Elco Motor Yachts is arguably the oldest name in electric marine propulsion — the Electric Launch Company debuted 55 battery-electric launches at the 1893 Chicago World's Fair (carrying over a million fairgoers) six decades before Torqeedo or ePropulsion existed, though the brand went dormant 1949–1987 while its parent (Electric Boat) focused on submarines.
- Ilmor Engineering, best known for IndyCar racing engines (founded 1983–84 by Mario Illien and Paul Morgan with Roger Penske and GM backing), only entered marine production seriously once MasterCraft began offering Ilmor Marine engines in 2010.
- The Arneson surface drive — a fixture of offshore racing since the 1980s — was invented by Howard Arneson, who made his first fortune inventing the automatic swimming-pool sweep, not from a marine-engineering background.

## Sources

- [Tohatsu — Wikipedia](https://en.wikipedia.org/wiki/Tohatsu)
- [Tohatsu Mercury Nissan Evinrude — Duckboats forum](https://duckboats.net/community/threads/tohatsu-mercury-nissan-evinrude.353520/)
- [Tohatsu Marine story — factory manager](https://www.tohatsumarine.co.jp/english/story/)
- [BRP Inc. Form 6-K, FY2020 — SEC EDGAR](https://www.sec.gov/Archives/edgar/data/1748797/000119312520303029/d31611dex991.htm)
- [Evinrude Outboard Motors — Wikipedia](https://en.wikipedia.org/wiki/Evinrude_Outboard_Motors)
- [Cox Marine CXO300: The Diesel Outboard Built From Scratch — Powerboat News](https://powerboat.news/cox-marine-cxo300-diesel-outboard/)
- [About Cox Marine](https://coxmarine.com/about-cox/)
- [OXE Marine — About](https://www.oxemarine.com/about)
- [OXE Diesel Models — OXE Marine AB](https://www.oxemarine.com/diesel-outboards)
- [Best electric outboard motor tested — Yachting Monthly](https://www.yachtingmonthly.com/gear/electric-outboard-motor-we-test-12-options-81853)
- [Volvo Penta to Discontinue Seven Marine Outboards — BoatTEST](https://boattest.com/article/volvo-penta-discontinue-seven-marine-outboards)
- [Volvo Penta to stop the sales and production of Seven Marine engines — Boating Industry](https://boatingindustry.com/news/2020/11/06/volvo-penta-to-stop-the-sales-and-production-of-seven-marine-engines/)
- [Selva Marine — Company](https://www.selvamarine.com/en/company/)
- [Chinese Outboard Brands Enter the U.S. Market — BoatTEST](https://boattest.com/article/chinese-outboard-brands-enter-us-market)
- [Parsun — About](https://www.parsunpower.com/our-company/about-parsun/)
- [Hidea Outboard Motors](https://www.hideaoutboardmotors.com/)
- [MTU Marine Parts Series 2000/4000/8000 — Vessel Core](https://www.vesselcore.eu/mtu-marine-parts)
- [Rolls-Royce celebrates 25 years of mtu Series 2000/4000](https://www.rolls-royce.com/media/press-releases/2021/27-10-2021-rr-celebrates-25-years-of-excellence-with-its-mtu-series-2000-and-series-4000.aspx)
- [New mtu 2000 engine from Rolls-Royce (2025 announcement)](https://www.rolls-royce.com/media/press-releases/2025/27-05-2025-new-mtu-2000-engine-from-rolls-royce-with-more-power-for-fast-vessels-and-yachts.aspx)
- [MAN Engines — Yacht engines](https://www.man.eu/engines/en/products/marine/yacht-engines/yacht.html)
- [MAN Diesel — Wikipedia](https://en.wikipedia.org/wiki/MAN_Diesel)
- [Volvo Penta — Wikipedia](https://en.wikipedia.org/wiki/Volvo_Penta)
- [Volvo Penta IPS — a trailblazing journey](https://www.volvogroup.com/en/news-and-media/news/2015/sep/volvo-penta-ips-a-trailblazing-journey.html)
- [IPS vs. Zeus: Which is Better? — Power & Motoryacht](https://powerandmotoryacht.com/boats/ips-vs-zeus-which-better/)
- [Moteurs Baudouin — Wikipedia](https://en.wikipedia.org/wiki/Moteurs_Baudouin)
- [Baudouin-Weichai Group](https://en.weichai.com/cpyfw/wmdpp/bda/)
- [Nanni Industries — Our Story](https://nannienergy.com/story/)
- [Steyr Motors GmbH — Wikipedia](https://en.wikipedia.org/wiki/Steyr_Motors_GmbH)
- [Mercury Marine — Wikipedia](https://en.wikipedia.org/wiki/Mercury_Marine)
- [Carl Kiekhaefer — Wikipedia](https://en.wikipedia.org/wiki/Carl_Kiekhaefer)
- [History of Mercury Marine — Crowley Marine](https://www.crowleymarine.com/d/general/history-of-mercury-marine)
- [Yamaha Motor Company — Wikipedia](https://en.wikipedia.org/wiki/Yamaha_Motor_Company)
- [Our Stories: Advance of 4-Stroke Engines in the Marine Business — Yamaha](https://global.yamaha-motor.com/stories/history/stories/0041.html)
- [Suzuki Marine — Wikipedia](https://en.wikipedia.org/wiki/Suzuki_Marine)
- [Yanmar — Wikipedia](https://en.wikipedia.org/wiki/Yanmar)
- [Yanmar — History](https://yanmar.com/eu/About-Us/History)
- [John Deere PowerTech 6.8L Marine Propulsion Engine](https://www.deere.com/en/marine-engines/propulsion/powertech-6-8l-6068sfm85/)
- [Weichai Group — Wikipedia](https://en.wikipedia.org/wiki/Weichai_Group)
- [Doosan Marine Propulsion Engine — Tontek (distributor profile)](https://www.tontekpower.com/doosan-marine-propulsion-engine-product/)
- [Hyundai Seasall Marine Engines — Engines Plus](https://www.enginesplus.co.uk/hyundai-seasall-marine-engines/)
- [Hyundai Marine Diesel Engines — Hyundai Seasall Australia](https://www.hyundaiseasall.com.au/)
- [List of Perkins engines — Wikipedia](https://en.wikipedia.org/wiki/List_of_Perkins_engines)
- [Perkins Engines — Wikipedia](https://en.wikipedia.org/wiki/Perkins_Engines)
- [Wärtsilä — History](https://www.wartsila.com/about/history)
- [Wärtsilä — History timeline](https://www.wartsila.com/about/history/timeline)
- [Wärtsilä — Wikipedia](https://en.wikipedia.org/wiki/W%C3%A4rtsil%C3%A4)
- [WinGD — Our history](https://wingd.com/about-wingd/our-history)
- [Caterpillar — Eighty Years Ago, Caterpillar Went to Sea](https://www.caterpillar.com/en/news/caterpillarNews/history/eightyyearsagocaterpillarwenttosea.html)
- [Caterpillar | MaK](https://www.caterpillar.com/en/brands/mak.html)
- [Kongsberg Kamewa Waterjets — 40 years of high-speed propulsion](https://www.kongsberg.com/maritime/about-us/news-and-media/our-stories/waterjets---40-years/)
- [Kamewa — Wikipedia](https://en.wikipedia.org/wiki/Kamewa)
- [Konrad Marine — History](http://www.konradmarine.com/history)
- [Pod Drives: Volvo Penta IPS, Cummins Zeus, ZF Marine, and CAT — boats.com](https://www.boats.com/boat-buyers-guide/pod-drives-volvo-penta-ips-cummins-zeus-zf-marine-cat/)
- [Mercury, Cummins part ways — Trade Only Today](https://tradeonlytoday.com/dealers/mercury-cummins-part-ways/)
- [Ilmor Engineering — Our Story](https://www.ilmor.com/About/our-story)
- [Ilmor — Wikipedia](https://en.wikipedia.org/wiki/Ilmor)
- [Indmar Engines — A 50th Anniversary — Malibu Parts](https://www.malibuparts.com/blogs/news/indmar-engines-a-50th-anniversary)
- [Correct Craft Acquires Indmar Marine Engines](https://indmar.com/correct-craft-acquires-indmar/)
- [Crusader Engines — Classic](https://www.crusaderengines.com/classic/)
- [Torqeedo — Company](https://www.torqeedo.com/us/en-us/c-about-torqeedo-2)
- [Torqeedo acquired by one of the world's largest outboard manufacturers](https://www.boatindustry.com/news/44987/torqeedo-acquired-by-one-of-the-worlds-largest-manufacturers-of-outboards)
- [Flux Marine — About Us](https://www.fluxmarine.com/about)
- [Electric Outboard Company Flux Marine Scores $15M Investment — CleanTechnica](https://cleantechnica.com/2022/03/31/electric-outboard-company-flux-marine-scores-15m-investment/)
- [Electric Launch Company — Wikipedia](https://en.wikipedia.org/wiki/Electric_Launch_Company)
- [125-year-old electric boat company still making history — Plugboats](https://plugboats.com/125-year-old-electric-boat-company-still-making-history/)
- [Howard Arneson: Inventor of the Arneson Surface Drive — boats.com](https://www.boats.com/on-the-water/howard-arneson-inventor-of-the-arneson-surface-drive/)
- [Arneson Surface Drives — Twin Disc](https://twindisc.com/arneson/)
- [SDS Surface Drive System — History — France Hélices](https://www.surfacedrivesystem.fr/history/)
- [France Hélices — Company](https://www.francehelices.fr/en/company/)
- [HamiltonJet — About Us](https://www.hamiltonjet.com/about-us)
- [Bill Hamilton (engineer) — Wikipedia](https://en.wikipedia.org/wiki/Bill_Hamilton_(engineer))
- [Beta Marine — Company Background](https://betamarine.co.uk/beta-marine-company-background/)
- Local corpus (cross-checked, not treated as authoritative): `knowledge/04_Johnson_and_Evinrude_Motor_History.md`, `knowledge/72_American_Boat_Manufacturers_Overview.md`

## Coverage notes (weakest data)

- **No local knowledge-base entries existed for this topic.** The mandatory KB lookup (`knowledge/entries/*.md` +
  `knowledge/graph/graph.json`) found neither path present in this repository — only the raw 82-doc Grok export
  corpus under `knowledge/` (a different, unstructured resource) and the ingested graph at
  `ingest/data/graph.json` (16 existing engine nodes, confirmed via grep). This lane's findings are pure web
  research; a `proposed_kb_entry` is included below.
- **Doosan Engine's exact corporate ownership is unresolved.** Sources conflict/are thin on whether the marine
  diesel business sits under "Doosan Group," "Doosan Infracore," or the post-2021 "HD Hyundai Infracore"
  restructuring; treat the parent-company attribution in the table as approximate pending a primary corporate
  source.
- **Hyundai SeasAll's full power range (upper ceiling) is not independently confirmed** — distributor pages list
  specific models (e.g., 270P) but no single primary source gave a complete min–max spec sheet in this pass.
- **Ilmor MV8 and Konrad Marine power-range figures are estimated from product-category context**, not from a
  single authoritative spec sheet; treat as directional, not exact.
- **France Hélices' relevance to the "France Helices" brief item was confirmed** (founded 1977, Cannes, by Paul
  Bezzi; SDS surface-drive system from 1993) but English-language primary sourcing is thinner than for the other
  entries — most detail comes from the company's own site.
- **Arneson Surface Drives is American (California), not French** — the original research brief's phrasing implied
  a possible pairing with France Hélices; both are covered as distinct, separate companies in the table above; do
  not conflate them.
- **Selva Marine and Hidea founding-year precision is soft.** Selva's outboard-specific 1959 date is sourced from
  company materials; Hidea's exact founding year could not be pinned down beyond "2000s" in this pass.
- **VW Marine TDI exact discontinuation year is approximate** (~2018–2019) — sources gave a "last availability
  early 2019" signal but not a single definitive end-of-production date.
- **China-origin brands (Weichai, Doosan, Hidea, Parsun) generally have thinner English-language primary sourcing**
  than Japanese, European, or US brands — figures for these should be treated as approximate pending a Chinese-
  language or investor-relations primary source pass.
- **Ship-scale power figures (Wärtsilä, MAN Energy Solutions, WinGD, Kongsberg Kamewa) are given as wide ranges**
  (up to tens of MW) rather than precise per-model ceilings, since the research brief's focus was manufacturer
  identity/history rather than a full model-by-model spec catalog; a follow-up lane could build a dedicated
  ship-engine spec table if DataYacht needs it.
- **Curation-pass note (TASK-017):** the "Rolls-Royce Commercial Marine / Kongsberg" row was renamed "Bergen
  Engines" and its Notable Models trimmed to avoid a near-duplicate of the separate "Kongsberg Kamewa" row (both
  originally described overlapping Kamewa-waterjet content) — see this file's own Curation notes above.
