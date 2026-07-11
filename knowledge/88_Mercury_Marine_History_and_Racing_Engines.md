# Mercury Marine: Full History (1939-2026) Tied Into Offshore Powerboat Racing

Curated from `research/round1/mercury-offshore-history.md` for TASK-017 Phase 2
(data-enrichment loop, round 2). Full Mercury Marine company/engine history from
1939 to current, tied into offshore powerboat racing (Kiekhaefer Aeromarine ->
Mercury Racing) and the current state of offshore powerboat racing engine rules.

## Curation notes

The **Engine models** table below feeds `ingest/src/mappers/engineModelMapper.js`
(new `engine_model` node type, TASK-017) — each row gets a MADE_BY edge to an
engine BRAND node (see `engineMapper.js` / `89_Global_Marine_Engine_Manufacturer_Directory.md`).
Per the ticket's explicit dedup instruction ("Mercury brand appears in both 88
and 89 — one brand node, model nodes point at it"), the Brand column was
cleaned up from the original research draft so every model naming the main
Mercury company resolves to the SAME node as knowledge/89's "Mercury Marine"
row and the pre-existing `engine:mercury-marine` node (created by the original
corpus file 07's Tier/Manufacturer table, well before this enrichment round):

- **Bare "Mercury" and "Mercury (ex-Thor)" brand cells** (Thor, Lightning,
  Thunderbolt, Mark 25/30/40/50/55, Mark 75, Mark 75H, Mark 78, Merc 800, Merc
  1000, OptiMax, Verado inline-6, FourStroke 250/300hp V8, Pro XS 175-300hp,
  Verado V10, Verado 600 V12) → curated to **"Mercury Marine"** (matching the
  existing node's exact name/slug). The "ex-Thor" and "Sanshin/Yamaha-built"
  historical asides that lived in the Brand cell are preserved in each row's
  own Notes cell instead.
- **Avator 7.5e / Avator 20e / 35e**: Brand "Mercury" → curated to **"Mercury
  Avator"**, matching knowledge/89's own distinct "Mercury Avator" brand row
  (Mercury's electric-outboard line is documented there as its own product
  brand, not folded into the main Mercury Marine row).
- **Zeus**: Brand "MerCruiser/Cummins MerCruiser Diesel" → curated to
  **"Mercury Zeus"**, matching knowledge/89's own distinct "Mercury Zeus" row.
- **Kiekhaefer Aeromarine surface drive**: Brand "Kiekhaefer Aeromarine /
  Mercury Racing" → curated to **"Mercury Racing"** (the historical Kiekhaefer
  Aeromarine division became Mercury Racing after Brunswick's 1990 acquisition,
  per this same file's Timeline — see that row's Notes). "Mercury Racing" is
  not a separate row in knowledge/89's Manufacturers directory, so its engine
  node is created on demand by `engineModelMapper.js`'s "create the brand if
  missing" rule the first time a model row names it.
- **"MerCruiser (first line)"**: Brand "MerCruiser" kept as-is — matches
  knowledge/89's own distinct "MerCruiser" brand row.
- **"Mariner (Sanshin/Yamaha-built)"**: Brand "Mariner" kept as-is (a genuinely
  distinct historical badge-engineered brand, not folded into Mercury Marine);
  its own engine node is created on demand.

**Review fix (HIGH, post-ship):** the Kiekhaefer Aeromarine surface drive
row's Power (hp) cell originally read "drive only (paired to various V8
racing engines)" — prose, not a number — which `engineModelMapper.js`'s
numeric parser read back as power_hp=8 (grabbing the digit out of "V8," the
same failure mode as the shipyard-lane Norfolk Naval Shipyard tonnage=8 bug).
Blanked per the "never guess" rule; the "no rated hp of its own, paired to
V8 engines" detail now lives in this row's Notes cell instead.
`engineModelMapper.js`'s `parsePowerHp()` now also rejects any digit
directly adjacent to a letter (leading OR trailing) defensively, for any
future corpus row shaped the same way — see that function's own code
comment. A full sweep of the other 36 engine_model rows' Power (hp) cells
found no other instances of this bug.
- **"Chainsaw engines" row removed**: the original research table included a
  1941-1945 Kiekhaefer wartime chainsaw-engine row, explicitly flagged in its
  own Type/Segment cells as "non-marine (WWII)" — not a boat engine, so it
  doesn't belong in an `engine_model` table. The historical fact (the wartime
  pivot that kept the company alive) remains in the Timeline table below,
  which stays as unclaimed doc prose this round.

The **Timeline** and **Racing classes** tables are left completely unclaimed
(no mapper) per the ticket's explicit scope: they are valuable doc content,
not graph rows, this round.

## Timeline

| Year | Event | Category | Detail | Source |
|---|---|---|---|---|
| 1939 | Carl Kiekhaefer buys bankrupt plant in Cedarburg, WI | Company founding | Plant held 300 defective "Thor" outboards (named for Thorwald Hansen); Kiekhaefer redesigned them (forged crankshafts) and rebranded them Mercury | [IGFA](https://igfa.org/history-carl-kiekhafer-and-mercury-marine/) |
| 1939 (Apr) | First Mercury-branded engines shown | Company | Debuted at the Milwaukee Sentinel Sportsman's Show | [IGFA](https://igfa.org/history-carl-kiekhafer-and-mercury-marine/) |
| 1940 | Explosive early demand | Company | ~16,000 orders taken at the 1940 New York Boat Show; 9,401 engines produced by year end | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1941 | WWII aluminum restrictions | Company | Feb. 1941 US government aluminum restrictions halted outboard production | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1941-1945 | Kiekhaefer pivots to WWII chainsaw engines | Company / WWII | Built a two-man chainsaw engine prototype in ~2 months (cut a 24" green log in 17s vs. 52s for the nearest competitor); became the largest chainsaw builder in the world during the war, alongside Navy outboard motor production | [IGFA](https://igfa.org/history-carl-kiekhafer-and-mercury-marine/) |
| 1944 | Wartime output milestone | Company | ~10,000 combined outboard/chainsaw engines produced by end of 1944; received the Army-Navy "E" Award for production excellence | [IGFA](https://igfa.org/history-carl-kiekhafer-and-mercury-marine/) |
| 1947 | Charlie Strang sketches a sterndrive concept | Engineering (pre-history of MerCruiser) | Strang conceived it in 1947 as an MIT research associate; joined Kiekhaefer Mercury as research director in 1951 and pitched it to Kiekhaefer, who initially dismissed it | [Marine Business News](https://www.marinebusinessnews.com.au/2021/12/our-history-the-risk-takers-charles-d-strang/) |
| 1947 | "Lightning" KE-7 introduced | Consumer engine | 10 hp two-cylinder, shown at the New York Boat Show | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1949 | "Thunderbolt" introduced | Consumer engine | ~40 cid four-cylinder inline, 25 hp | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1951 | HQ relocation | Company | Kiekhaefer moves the company to Fond du Lac, Wisconsin — still HQ today | [everythingaboutboats.org](https://everythingaboutboats.org/mercury-marine/) |
| 1955-1956 | Kiekhaefer's NASCAR detour | Racing (non-marine) | Kiekhaefer-owned NASCAR Grand National team won the 1955 and 1956 championships (drivers Tim Flock, Buck Baker), including a 16-consecutive-race win streak, before Kiekhaefer exited stock car racing | [Wikipedia search summary](https://en.wikipedia.org/wiki/Carl_Kiekhaefer) |
| 1957 | "Lake X" secret test facility; Mark 75 | Engine / racing | Kiekhaefer began covert high-speed testing at a Florida lake nicknamed "Lake X"; introduced the Mark 75, the industry's first inline-6-cylinder outboard (60 cid, 60 hp) | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1958 | World speed record | Racing | Stock Mark 75H sets a 107 mph world outboard speed record; Mark 78 (70 hp) introduced same year | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1960 | Merc 800 | Consumer engine | 80 hp, full F-N-R gearshift, "thru-hub" exhaust | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1961 (Jan 13) | Kiekhaefer commits to a sterndrive | Company | Told distributors publicly he would build one, reversing his earlier "pure loser" stance | [Mercury Marine "Legacy" week 9](https://www.mercurymarine.com/en/us/legacy/history/week9) (via search summary) |
| 1961 (Mar 23-24) | MerCruiser line launched | Engine | Debuted at the Chicago boat show; name "MerCruiser" chosen the week before; captured the bulk of the sterndrive market by year end | search summary of Mercury Marine "Legacy" week 9 |
| 1961 | Brunswick acquisition | Company | Kiekhaefer Mercury becomes a division of Brunswick Corporation | [everythingaboutboats.org](https://everythingaboutboats.org/mercury-marine/) |
| 1962 | Merc 1000 | Consumer engine | Inline-6, 100 hp, "Phantom Black" paint scheme | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1966 | Electronic ignition | Engine tech | Introduced across six-cylinder Mercury models — an industry first | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1970 | Kiekhaefer resigns; founds Aeromarine | Company / racing | Carl Kiekhaefer resigns as president of Kiekhaefer Mercury; founds Kiekhaefer Aeromarine Motors, focused on high-performance/racing engines and components | [Wikipedia summary](https://en.wikipedia.org/wiki/Carl_Kiekhaefer) |
| 1972 | Renamed Mercury Marine | Company | Kiekhaefer Mercury formally renamed Mercury Marine | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 1972 | K-Planes trim tabs | Racing tech | Kiekhaefer Aeromarine introduces K-Planes hydraulic trim tabs and "Zero Effort" steering controls, becoming industry standards in high-performance boats | [Wikipedia summary of Carl Kiekhaefer](https://en.wikipedia.org/wiki/Carl_Kiekhaefer) |
| 1974/1976 | Mariner brand launched | Consumer brand | Introduced in Australia (1974), then US/Europe (1976); built by Yamaha subsidiary Sanshin under a 1973 Brunswick-Yamaha joint venture (Brunswick held 38% of Sanshin) — badge-engineered Yamahas sold to double Mercury's distribution | search summary citing [Powerboat News](https://powerboat.news/whatever-happened-to-mariner-the-merc-a-ha-story/) |
| 1983 | Carl Kiekhaefer dies | Company | Son Fred Kiekhaefer later purchases Aeromarine | [Wikipedia summary of Carl Kiekhaefer](https://en.wikipedia.org/wiki/Carl_Kiekhaefer) |
| 1986 | Mercury/Mariner EFI convergence | Engine tech | Electronic fuel injection introduced; Mercury and Mariner become mechanically identical from this point | search summary citing Powerboat News |
| 1988 | Surface-drive racing outdrive | Racing | Kiekhaefer Aeromarine introduces a surface-piercing racing outdrive able to handle high horsepower; it comes to dominate offshore racing | search summary of Carl Kiekhaefer / Kiekhaefer Aeromarine history |
| 1990 | Brunswick buys Kiekhaefer Aeromarine | Company / racing | Fred Kiekhaefer sells Aeromarine to Brunswick; the division becomes "Mercury Hi-Performance," later renamed Mercury Racing; the racing surface drive becomes the "Number Six" drive | search summary of Carl Kiekhaefer / [Speed on the Water](https://www.speedonthewater.com/the-rich-history-of-water-street-and-mercury-racing/) |
| 1993-1998 | Yamaha/Mercury 4-stroke co-development | Engine tech | Joint four-stroke development; Mariner four-strokes used Yamaha powerheads in Mercury architecture | search summary citing Powerboat News |
| 1996-1997 | OptiMax introduced | Engine tech | Direct-injection ("air-assist") two-stroke; sources vary on the exact first model year (1995-1997 cited across dealer/forum sources) — flagged as a weak data point | [marineengine.com forum](https://www.marineengine.com/boat-forum/threads/optimax-direct-injection-first-model-year.415480/); [injectorservice.com](https://injectorservice.com/optimax-fuel-system) |
| 1999 | Mariner discontinued in US | Consumer brand | Mercury ends US Mariner sales; the brand continues in select international markets | search summary citing Powerboat News |
| 2004 (Feb 15) | Verado launched | Engine tech | World's first supercharged inline-6 four-stroke outboard, 2.6L, launched at the Miami International Boat Show in 200/225/250/275 hp; ran until 2021 (17-year production run) | [gregterzian.com](https://gregterzian.com/2019/01/08/the-mercury-verado-launch-a-look-back-at-an-extraordinary-day-in-marine-history/); [marineenginedigest.com](https://www.marineenginedigest.com/profiles/mercury/verado.htm) |
| 2007 | Zeus pod drive | Engine tech | Dual-engine pod-drive propulsion system, developed with Cummins MerCruiser Diesel | [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine) |
| 2010 | QC4v 1350 introduced | Racing engine | 9.0L turbocharged V8 racing sterndrive, designed from scratch for go-fast/offshore applications | [enginelabs.com](https://www.enginelabs.com/news/mercury-racing-courting-crate-engine-market-with-1650-horsepower/) |
| 2017 | Class 1 spec-engine deal | Racing class | Mercury Racing 1100 Competition (9.0L twin-turbo QC4v V8, ~1,100 hp) becomes the mandatory twin spec sterndrive for the UIM Class 1 World Championship, produced by Powerboat P1 | [Powerboat News](https://powerboat.news/uim-homologates-four-mercury-racing-engines-for-offshore-international-racing/) |
| 2018 (May) | OptiMax discontinued | Engine tech | Mercury's last two-stroke DFI outboard ends production; replaced in the 200-300 hp band by new naturally aspirated FourStroke V6/V8 models | [etecownersgroup.com](https://www.etecownersgroup.com/post/end-of-the-twostrokepowercycle-outboard-engine-era-11282694) |
| 2019 | P1 SuperStock spec engine | Racing class | Mercury Racing 300R (4.6L NA V8, 44% more displacement and up to 40% more torque than the two-stroke 300XS it replaced) becomes exclusive spec power for Powerboat P1's SuperStock class | [Speed on the Water](https://speedonthewater.com/mercury-racing-300r-outboard-spec-power-for-2019-powerboat-p1-superstock-racing-season/) |
| 2019 | Class One USA launched | Racing class | New APBA Offshore category using twin Mercury Racing 1100 Comp sterndrives as spec power; Victory Team (Victory 3) won the inaugural title at Roar Offshore Fort Myers | search summary citing [Victory Team](https://en.wikipedia.org/wiki/Victory_Team) |
| 2021 (Feb 11) | Verado 600 V12 launched | Consumer/flagship engine | World's first V12 outboard; naturally aspirated 7.6L (not supercharged, unlike the original inline-6 Verado — see Coverage notes); 600 hp, 1,260 lb dry; industry-first 2-speed automatic transmission and steerable gearcase (powerhead fixed, gearcase pivots) | [GlobeNewswire](https://www.globenewswire.com/news-release/2021/02/11/2174362/0/en/Mercury-Marine-introduces-the-all-new-V12-600hp-Verado-engine-redefining-outboard-performance.html) |
| 2022 (Nov 15) | Verado V10 launched | Consumer engine | Industry's first V10 outboard; 5.7L naturally aspirated, 350/400 hp (later a 425 hp variant), replacing the supercharged V6 Verados in that power band; 695 lb, runs on 87 octane | [Brunswick press release](https://www.brunswick.com/news/press-releases/detail/740/mercury-marine-introduces-the-industrys-first-v10) |
| 2023 (Jan CES debut / Apr shipping) | Avator 7.5e | Electric outboard | Mercury's first electric outboard; 750 W, 48V/1kWh lithium battery (Mastervolt partnership), equivalent to a 3.5 hp gas outboard | [Plugboats](https://plugboats.com/5-mercury-electric-outboard-avator-7-5e-shipping/); [electrek.co](https://electrek.co/2023/01/06/mercury-avator-7-5e-electric-outboard-boat-motor/) |
| 2023 (Aug 29) | Avator 20e/35e | Electric outboard | 2,200 W / 3,700 W; comparable acceleration to 5 hp / 9.9 hp FourStroke gas outboards; 2,300 Wh battery, IP67-rated, transverse-flux motor | [Brunswick press release](https://www.brunswick.com/news/press-releases/detail/800/mercury-marine-launches-avator-20e-and-35e-electric) |
| 2024 (Jun) | Fond du Lac layoffs | Company | ~300 employees laid off at Fond du Lac HQ, which still employed 3,500+ full-time staff before the cuts | [WFRV / Fox11](https://fox11online.com/news/local/mercury-marine-layoffs-announced-fond-du-lac-nearly-300-workers) |
| 2024 | Mercury Racing 450R | Racing/performance engine | 4.6L supercharged V8, 450 peak propshaft hp, 40% more torque than the 400R it supersedes (400R remains in the lineup) | [Mercury Marine press](https://www.mercurymarine.com/eu/en/about-us/news/new-mercury-racing-450r-delivers-unrelenting-outboard-performanc) |
| 2025 (Aug) | Short 15" racing midsection | Racing engine | New 15" Heavy-Duty CMS midsection for the 200R/300R/200 ROS/300 ROS, purpose-built for tunnel hulls/cats; 300 ROS eligible for P1 SuperStock, Bracket 700 and X-Cat classes | [Brunswick press release](https://www.brunswick.com/news/press-releases/detail/927/engineered-to-win-mercury-racings-new-200r-300r-and-ros) |
| 2026 (Jan, CES) | 808 hp V12 concept | Racing/performance concept | Concept outboard built on the naturally aspirated 7.6L V12 (600 Verado) platform, pointing toward a supercharged ~750-800 hp production variant; not yet a shipping product | [Powerboat News](https://powerboat.news/mercurys-808hp-v12-concept-signals-power-evolution/); [Water Wire](https://www.thewaterwire.com/releases/2026/01/mercurys-new-concept-808-hp-outboard/) |

## Engine models

| Model/Series | Brand | Years | Type | Power (hp) | Segment | Notes |
|---|---|---|---|---|---|---|
| Thor (rebranded) | Mercury Marine | 1939 | single-cyl 2-stroke | not specified in sources found | consumer outboard | Rebranded from "Thor": 300 defective Montgomery Ward-rejected units rebuilt with forged crankshafts. |
| Lightning (KE-7) | Mercury Marine | 1947 | 2-cyl 2-stroke | 10 | consumer outboard | Shown at NY Boat Show |
| Thunderbolt | Mercury Marine | 1949 | 4-cyl inline 2-stroke | 25 | consumer outboard | ~40 cid |
| Mark 25/30/40/50/55 series | Mercury Marine | 1950s | inline 2-stroke | 20-40 | consumer outboard | Mark-series naming convention begins |
| Mark 75 | Mercury Marine | 1957 | inline-6, 2-stroke | 60 | consumer/racing outboard | Industry's first 6-cylinder outboard; developed at secret "Lake X" |
| Mark 75H | Mercury Marine | 1958 | inline-6, 2-stroke | 60 (record-tuned) | racing outboard | Set 107 mph world outboard speed record |
| Mark 78 | Mercury Marine | 1958 | inline-6, 2-stroke | 70 | consumer outboard | — |
| Merc 800 | Mercury Marine | 1960 | 2-stroke | 80 | consumer outboard | First with F-N-R shift + thru-hub exhaust |
| MerCruiser (first line) | MerCruiser | 1961- | sterndrive (I/O) | varies by donor engine | sterndrive | Launched Chicago Boat Show 1961; captured majority world market share within the decade |
| Merc 1000 | Mercury Marine | 1962 | inline-6, 2-stroke | 100 | consumer outboard | "Phantom Black" paint |
| Mariner (Sanshin/Yamaha-built) | Mariner | 1974-1999 (US) | 2-stroke, later 4-stroke | full consumer range | consumer outboard | Badge-engineered Yamahas built by Sanshin under a 1973 Brunswick-Yamaha JV; discontinued in the US 1999, survives in some export markets |
| OptiMax | Mercury Marine | 1996/97-2018 | 2-stroke, direct injection (DFI) | up to 300-class | consumer/performance outboard | Air-assist DFI; met emissions rules two-strokes otherwise couldn't; last built May 2018 |
| Kiekhaefer Aeromarine surface drive ("Number Six" drive) | Mercury Racing | 1988- | surface-piercing racing outdrive | | racing sterndrive | Drive only — paired to various V8 racing engines, no rated hp of its own. Originally the Kiekhaefer Aeromarine surface drive; came to dominate offshore racing after 1988 introduction; the Kiekhaefer Aeromarine division became Mercury Racing after Brunswick's 1990 acquisition (see Timeline). |
| Verado (inline-6, supercharged) | Mercury Marine | 2004-2021 | inline-6, supercharged 4-stroke | 200-275 hp at launch (later up to ~400 in some SC variants before V10 replacement) | consumer outboard | World's first supercharged 4-stroke outboard; 2.6L; 17-year production run |
| Zeus | Mercury Zeus | 2007- | pod drive (diesel-paired) | varies by donor diesel | sterndrive/pod system | Joint development with Cummins MerCruiser Diesel |
| QC4v 1100 Competition | Mercury Racing | ~2010s-present | quad-cam 4-valve twin-turbo V8 | 1,100 | racing sterndrive | Mandatory UIM Class 1 spec engine since 2017; combined twin-engine output 2,200 hp |
| QC4v 1350 | Mercury Racing | 2010- | quad-cam 4-valve turbo V8 | 1,350 | racing sterndrive | 9.0L, designed from scratch for go-fast/offshore use |
| QC4v 1550 (dual-cal) | Mercury Racing | ~2011- | quad-cam 4-valve turbo V8, dual calibration | 1,550 (race fuel) / 1,350 (pump fuel, "Pleasure" key fob) | racing sterndrive | Electronic key-fob switch between race/pump-fuel maps |
| QC4v 1650 | Mercury Racing | ~2016- | quad-cam 4-valve turbo V8 | 1,650 (race fuel) / 1,350 (pump fuel) | racing sterndrive (crate engine) | 552 ci, NiCom-coated bores; Miss GEICO was first team to receive it |
| QC4v 1750 Competition | Mercury Racing | ~2015- | quad-cam 4-valve turbo V8 | 1,750 | racing sterndrive | Described by Mercury as the most powerful engine it has produced (sterndrive category) |
| 2.5 EFI Drag | Mercury Racing | — | V6 EFI drag outboard | 300+ (propshaft) | racing outboard (drag) | Built for APBA-sanctioned Outboard Drag Boat Association Modified Production class |
| 300R | Mercury Racing | 2019- | 4.6L NA V8, DOHC 4-valve | 300 | racing outboard | Spec engine for Powerboat P1 SuperStock since 2019; runs 87 octane |
| 400R | Mercury Racing | ~2018- | 4.6L supercharged V8 | 400 | racing/performance outboard | Superseded (not replaced) by the 450R in 2024 |
| 450R | Mercury Racing | 2024- | 4.6L supercharged V8 | 450 | racing/performance outboard | 40% more torque than 400R; +5-10 mph top speed reported by boatbuilders |
| 200R / 250R / 150R | Mercury Racing | 2020s | 4.6L/3.4L V8/V6, various tune | 150 / 200 / 250 | racing/performance outboard | Entry points into the R-Series racing lineup |
| 300 ROS / 200 ROS | Mercury Racing | 2025- | 4.6L NA V8, "Racing Offshore" tune | 200 / 300 | racing outboard (competition-only) | Above-water exhaust, racing trim cylinder; 15" short midsection for tunnel/cat classes |
| 60 APX | Mercury Racing | 2020s | 4-stroke, single/small config | 60 | racing outboard (circuit/tunnel) | UIM Formula 4 class |
| 200 APX | Mercury Racing | 2020s | V6 4-stroke | 200+ | racing outboard (circuit/tunnel) | UIM F2 and APBA OPC tunnel-boat classes; ~90% lower emissions vs. legacy 2-stroke competition outboards |
| 250 APX | Mercury Racing | 2020s | 4.6L V8 | 250+ | racing outboard (circuit/tunnel) | 12" midsection for Formula 1 tunnel boats |
| 360 APX | Mercury Racing | 2020s | V8 4-stroke | 360 | racing outboard (circuit) | Powers the premier UIM F1H2O World Championship tunnel boats; 7,000 rpm WOT |
| FourStroke 250/300hp V8 | Mercury Marine | 2018- | 4.6L NA V8 | 250 / 300 | consumer outboard | Direct successor line to OptiMax in that power band |
| Pro XS 175-300hp | Mercury Marine | 2018- | 3.4L V6 / 4.6L V8 | 175-300 | performance-leaning consumer outboard | Positioned between FourStroke and Verado/Racing |
| Verado V10 (350/400/425hp) | Mercury Marine | 2022- | 5.7L naturally aspirated V10 | 350 / 400 / 425 | consumer outboard | Industry's first V10 outboard; replaced supercharged inline-6 Verados in this band; 695 lb |
| Verado 600 V12 | Mercury Marine | 2021- | 7.6L naturally aspirated V12 | 600 | consumer/flagship outboard | World's first V12 outboard; 2-speed auto transmission, steerable gearcase |
| Avator 7.5e | Mercury Avator | 2023- | electric, transverse-flux motor | 750 W (~3.5 hp equiv.) | electric outboard | 48V/1kWh battery |
| Avator 20e / 35e | Mercury Avator | 2023- | electric, transverse-flux motor | 2,200 W / 3,700 W (~5 hp / ~9.9 hp equiv.) | electric outboard | 2,300 Wh battery, IP67 |
| 808 hp V12 concept | Mercury Racing | 2026 (concept) | supercharged 7.6L V12 (proposed) | ~750-800 (concept target) | racing/performance concept | Shown at CES 2026; not a shipping product as of this research pass |

## Racing classes

| Class | Sanctioning Body | Engine Rules | Mercury Involvement | Era | Notes |
|---|---|---|---|---|---|
| Class 1 World Championship | UIM (Union Internationale Motonautique); series produced by Powerboat P1 | Spec engine: twin Mercury Racing 1100 Competition (9.0L QC4v twin-turbo V8) since 2017 | Sole/mandatory engine supplier | 2017-present | Combined output 2,200 hp; boats can exceed ~160 mph; earlier eras (1980s-2000s) ran unrestricted/Lamborghini-V12-era power (see Coverage notes and cross-reference to `knowledge/03`) |
| P1 SuperStock | Powerboat P1 (UIM-affiliated) | Spec engine: Mercury Racing 300R (4.6L NA V8 outboard) since 2019 | Sole/exclusive engine supplier | 2019-present | Replaced the legacy two-stroke 300XS |
| Class One USA | APBA Offshore Championship Series | Spec engine: twin Mercury Racing 1100 Competition sterndrives | Sole engine supplier | 2019-present | Inaugural 2019 title won by Victory Team (UAE) |
| Super Cat | APBA Offshore / Race World Offshore | Twin engines, ~850 hp class; spec supplier is Sterling Engines (won a 4-year exclusive APBA contract, outbidding Mercury) | Not the current spec supplier — contrast case | Sterling contract from ~2023 | Direct competitive loss for Mercury in this specific class; some teams reported running non-Sterling engines afterward (unclear enforcement — see Coverage notes) |
| Bracket 700 / X-Cat / general APBA & OPA offshore classes | APBA, OPA (Offshore Powerboat Association) | Mixed — no single spec supplier; Mercury Racing 300 ROS/200 ROS and other R-Series/APX engines are eligible/common but not mandatory across the board | Major but non-exclusive supplier | Ongoing | Full current OPA class list not confirmed from primary sources this pass (see Coverage notes) |
| UIM F1H2O World Championship (tunnel boats, circuit racing, not offshore) | UIM | Spec engine: Mercury Racing 360 APX (V8, 360 hp) | Sole engine supplier | Current | Circuit/closed-course tunnel-hull racing, not offshore point-to-point/endurance — included for contrast with Mercury's offshore programs |
| UIM F2 / APBA OPC tunnel classes | UIM / APBA | Spec: Mercury Racing 200 APX | Sole/primary supplier | Current | Feeder class below F1H2O |
| UIM Formula 4 | UIM | Spec: Mercury Racing 60 APX | Sole/primary supplier | Current | Entry-level tunnel-boat racing |
| Victory Team (UAE) — cross-brand context | Competes in Class 1 / Class One USA | Uses the class-mandated Mercury Racing spec engines today; historically ran Lamborghini-derived V12s in the pre-spec-engine Class 1 era | Customer under spec-engine rules (not always Mercury-powered historically) | 1986/1992-present | 14 C1 World Championships; included per the research brief as a "contrast" team that predates the Mercury spec-engine mandate |

## Sources

- [IGFA: History, Carl Kiekhafer and Mercury Marine](https://igfa.org/history-carl-kiekhafer-and-mercury-marine/)
- [Wikipedia: Mercury Marine](https://en.wikipedia.org/wiki/Mercury_Marine)
- [Wikipedia: Carl Kiekhaefer](https://en.wikipedia.org/wiki/Carl_Kiekhaefer)
- [everythingaboutboats.org: Mercury Marine](https://everythingaboutboats.org/mercury-marine/)
- [Marine Business News: The Risk Takers Part 1 - Charles D. Strang](https://www.marinebusinessnews.com.au/2021/12/our-history-the-risk-takers-charles-d-strang/)
- [Marine Business News: The Risk Takers Part 2 - Carl Kiekhaefer](https://www.marinebusinessnews.com.au/2022/01/our-history-the-risk-takers-part-2-carl-kiekhaefer/)
- [Powerboat News: Whatever Happened to Mariner? The Merc-a-ha Story](https://powerboat.news/whatever-happened-to-mariner-the-merc-a-ha-story/)
- [Speed on the Water: The Rich History of Water Street and Mercury Racing](https://www.speedonthewater.com/the-rich-history-of-water-street-and-mercury-racing/)
- [Greg Terzian: The Mercury Verado Launch](https://gregterzian.com/2019/01/08/the-mercury-verado-launch-a-look-back-at-an-extraordinary-day-in-marine-history/)
- [Marine Engine Digest: Mercury's Verado family](https://www.marineenginedigest.com/profiles/mercury/verado.htm)
- [GlobeNewswire: Mercury Marine introduces the all new V12 600hp Verado engine](https://www.globenewswire.com/news-release/2021/02/11/2174362/0/en/Mercury-Marine-introduces-the-all-new-V12-600hp-Verado-engine-redefining-outboard-performance.html)
- [Brunswick: Mercury Marine introduces the industry's first V10 outboards](https://www.brunswick.com/news/press-releases/detail/740/mercury-marine-introduces-the-industrys-first-v10)
- [Brunswick: Mercury Marine launches Avator 20e and 35e electric outboards](https://www.brunswick.com/news/press-releases/detail/800/mercury-marine-launches-avator-20e-and-35e-electric)
- [Plugboats: Avator 7.5e now shipping](https://plugboats.com/5-mercury-electric-outboard-avator-7-5e-shipping/)
- [electrek.co: Mercury Avator 7.5e launch](https://electrek.co/2023/01/06/mercury-avator-7-5e-electric-outboard-boat-motor/)
- [Fox11 / WFRV: Mercury Marine layoffs Fond du Lac 2024](https://fox11online.com/news/local/mercury-marine-layoffs-announced-fond-du-lac-nearly-300-workers)
- [Mercury Marine (Brunswick press): New Mercury Racing 450R](https://www.mercurymarine.com/eu/en/about-us/news/new-mercury-racing-450r-delivers-unrelenting-outboard-performanc)
- [Powerboat News: UIM Homologates Four Mercury Racing Engines for Offshore](https://powerboat.news/uim-homologates-four-mercury-racing-engines-for-offshore-international-racing/)
- [Speed on the Water: Mercury Racing 300R Outboard Spec Power For 2019 P1 SuperStock](https://speedonthewater.com/mercury-racing-300r-outboard-spec-power-for-2019-powerboat-p1-superstock-racing-season/)
- [Speed on the Water: Mercury Racing Releases 1550/1350 Turbocharged Engine](https://speedonthewater.com/mercury-racing-releases-1550-1350-turbocharged-engine/)
- [enginelabs.com: Mercury Racing Courting Crate-engine Market with 1,650 Horsepower](https://www.enginelabs.com/news/mercury-racing-courting-crate-engine-market-with-1650-horsepower/)
- [Speed on the Water: Mercury Unveils 1650 Race Engine - Miss GEICO to Run First Set](https://www.speedonthewater.com/mercury-unveils-1650-race-engine/)
- [Speed on the Water: Miss GEICO Still 'Plenty Fast' With Mercury Racing 1100 Comp Engines](https://speedonthewater.com/miss-geico-still-plenty-fast-with-mercury-racing-1100-comp-engines/)
- [Wikipedia: Victory Team](https://en.wikipedia.org/wiki/Victory_Team)
- [Powerboat News: The Lamborghini Offshore V12: Class 1's Most Feared Engine](https://powerboat.news/lamborghini-v12-offshore-racing-engine/)
- [SpeedWake forum: APBA Super Cat / Sterling contract](https://www.speedwake.com/threads/apba-super-cat.7321/)
- [Sterling Engines](https://sterlingengines.com/)
- [Speed on the Water: SV Offshore Racing Repowering For 2023 Season](https://speedonthewater.com/sv-offshore-racing-repowering-for-2023-season/)
- [Mercury Racing: 360apx competition outboard](https://www.mercuryracing.com/engines/competition/360-apx.html)
- [Mercury Racing: 250apx competition outboard](https://www.mercuryracing.com/engines/competition/250-APX.html)
- [Mercury Racing: 60apx competition outboard](https://www.mercuryracing.com/engines/competition/60apx.html)
- [Speed on the Water: Mercury Racing Adds 60-HP Model To APX Line](https://speedonthewater.com/mercury-racing-adds-60-hp-model-to-apx-competition-outboard-line/)
- [Brunswick: Engineered To Win - Mercury Racing's New 200R, 300R, and ROS Outboards](https://www.brunswick.com/news/press-releases/detail/927/engineered-to-win-mercury-racings-new-200r-300r-and-ros)
- [Powerboat News: Mercury's 808hp V12 Concept Points to Supercharged Future](https://powerboat.news/mercurys-808hp-v12-concept-signals-power-evolution/)
- [Water Wire: Mercury's New Concept 808-HP Outboard](https://www.thewaterwire.com/releases/2026/01/mercurys-new-concept-808-hp-outboard/)
- [etecownersgroup.com: End of the Two-Stroke-Power-Cycle Outboard Engine Era](https://www.etecownersgroup.com/post/end-of-the-twostrokepowercycle-outboard-engine-era-11282694)
- [marineengine.com forum: OptiMax Direct Injection first model year discussion](https://www.marineengine.com/boat-forum/threads/optimax-direct-injection-first-model-year.415480/)

## Coverage notes (weakest claims)

- **KB lookup ran against an empty/mismatched structure.** This repo's `knowledge/` directory holds 82 raw
  Grok-export research documents (the DataYacht source corpus), not the `knowledge/entries/*.md` +
  `knowledge/graph/graph.json` lessons-learned KB format my process assumes. There was nothing to score with
  the tag/symptom/body-hit algorithm, so `kb_hits` below is empty rather than reflecting a null result from a
  real search. Grepping the corpus directly (03 and 04) surfaced only tangential Mercury references, confirmed
  above.
- **OptiMax's exact first model year is unresolved.** Sources conflict between 1995, 1996, and 1997; some
  cite specific 200/225hp 1997 model listings while general histories say "1996." Treat any single year as
  provisional until a primary Mercury Marine source is found.
- **Verado 600 V12 is naturally aspirated, not supercharged** — this corrects an assumption embedded in the
  original research brief (which grouped it under "Verado supercharged 4-stroke era"). Only the original
  2004-2021 inline-6 Verado family (and the 400R/450R Racing derivatives) is supercharged; the V10 (2022) and
  V12 (2021) mainstream Verados are both naturally aspirated. Flagging this explicitly since it's a correction
  to the task's framing.
- **Super Cat / Sterling Engines status is dated and possibly in flux.** The cited 4-year exclusive Sterling
  contract appears to date to ~2023, but at least one 2024 source (SV Offshore Racing) mentions a team running
  a different manufacturer's (Scorpion Racing) engine that season, suggesting either an exception, a lapsed
  exclusivity, or reporting inconsistency. Not independently resolved this pass — recommend a follow-up pass
  specifically on current (2026) Super Cat technical regulations before publishing this as fact.
- **Full current OPA (Offshore Powerboat Association) class list is incomplete.** Search results surfaced class
  names (Bracket 400/500/700, Class 1/4/5/6, Super Stock, Extreme, "Turbines") but not a single authoritative,
  current class-by-class engine-rule breakdown. The OPA and APBA rulebook PDFs found in search results were not
  fetched directly this pass; recommend a follow-up fetch of `apba.org`'s current offshore rulebook PDF for a
  complete, primary-sourced class/engine table.
- **Pre-spec-engine Class 1 era (1980s-2000s) engine landscape** (Lamborghini V12s, unrestricted power) is
  summarized from search snippets only, not a fetched primary source; treated here as contrast context per the
  research brief's request, not as a fully verified sub-history.
- **1961 sterndrive announcement date/quote and the "MerCruiser" naming story** came through as a search-engine
  synthesis of `mercurymarine.com/en/us/legacy/history/week9`, which could not be fetched directly (the site's
  other "Legacy" subpages returned HTTP 403 to WebFetch); treat those specific dates as good-faith but
  not independently re-verified against the primary page.
- **Numeric hp/weight/displacement figures for the earliest 1988 Kiekhaefer Aeromarine surface drive** were not
  found with specifics (only "handled high horsepower" language) — flagged as thin.

## Open questions

- Exact first production model-year and serial-number cutover for OptiMax.
- Whether Sterling Engines' Super Cat exclusivity is still in force as of the 2026 season, or whether Mercury
  Racing has re-entered that specific class.
- A complete, current (2026) APBA/OPA rulebook-sourced table of every active offshore class and its engine
  rules (this pass only surfaced partial/secondary-source class names).
