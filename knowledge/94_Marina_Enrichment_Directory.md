# Marina Enrichment Directory

Curated from `research/round3/marina-enrichment.md` for TASK-020. Enriches
existing marina nodes and creates new famous-marina nodes, via
`marinaMapper.js`'s second guard (`isMarinaEnrichmentTable`/
`mapMarinaEnrichmentTables` — mirrors `engineMapper.js`'s TASK-017 dual-
guard-per-file pattern).

**Actual resolution split (verified against a real full ingest, not just
the research doc's own count):** of the 51 rows below, **13 resolve onto
a pre-existing graph node** (the 7 the doc itself intended, PLUS 6 more —
Milta Bodrum Marina, Port Adriano, Puerto Banús, Real Club Náutico de
Palma, RMK Merrill-Stevens, Sanctuary Cove Marina — that this research
pass's own doc listed under "New marinas" but which, per its own Coverage
notes, it "had no code-execution tool" to verify against the full graph;
these 6 already existed from earlier corpus files, e.g. file 56's Spain
marina guide) and **38 mint a genuinely new node**. This is a GOOD
outcome (six fewer accidental near-duplicates than the research doc's own
count implied), not a bug — see the per-row Notes for provenance either
way.

## Curation notes

**Row-count note (documented, not a bug):** the source doc's own Coverage
notes claim "49 marinas ... (7 matched ... + 42 new)". The actual row
counts, verified by parsing both tables directly, are **7 matched + 44
new = 51** — another one-off arithmetic slip in a research doc's own
summary line (see knowledge/91's identical finding for TASK-019's builder
research pass). Nothing was added or removed from either table; both are
reproduced below exactly as researched.

**1 Marina cell curated** so it resolves cleanly by exact name onto the
existing graph node:

- **"Safe Harbor Rybovich (= \"Rybovich Superyacht Marina\" dup node)"**
  → **"Safe Harbor Rybovich"** (the parenthetical dup-node annotation
  moved into this row's own Notes cell). The actual dedup of the two
  nodes (`marina:rybovich-superyacht-marina` and
  `marina:safe-harbor-rybovich`) is performed by `graphCleanup.js`'s
  `MARINA_MERGE_MAP`, not by this enrichment mapper — see that module's
  own header.

**Collision guards (hard requirement, verified by dedicated tests, not
just "our data happens to avoid it"):** two new-marina rows explicitly
warn that their name is similar to — but a completely different real
place from — an EXISTING graph node: "Marina di Portofino" (Italy) vs.
the graph's "Portofino Hotel & Marina" (Redondo Beach, California), and
"Yacht Haven Grande (USVI)" (St Thomas) vs. the graph's "Yacht Haven
Marina" (Pacific Northwest). Neither research row uses the EXACT same
name as its unrelated existing-node namesake, so in THIS curated data
there is no literal name collision to resolve either way — but
`marinaMapper.js`'s `resolveMarinaId()` is still built and tested (see
`ingest/tests/marinaEnrichmentMapper.spec.js`) to reject an exact-name
match whose existing `located_in` region disagrees with the incoming
row's own City/Country, so a FUTURE research pass that does reuse one of
these exact names can never silently cross-contaminate the wrong
facility.

**Weakest fields, per the source doc:** max draft and fuel-dock
confirmation (many operators don't publish either) — left empty rather
than guessed, consistent with every other mapper in this project.

## Marinas matched to existing graph nodes (enrichment)

| Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel Dock | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Marina Ibiza | Spain | Ibiza Town, Balearic Islands | 85 | 60 | 10 | Yes | marinaibiza.com / marinaportibiza.com | Formerly "Ibiza Magna." Graph node currently holds `max_loa: 110m, berths: 425` — likely refers to the wider port complex including adjacent basins (Club Náutico, Botafoch); the 85-berth/60m figure is specific to the superyacht reception marina per the operator's own site. Flagging discrepancy rather than overwriting. |
| Marina Port Vell | Spain | Barcelona | 151 | 190 | 10 (at Spanish Quay) | Yes (bunker service) | oneoceanportvell.com | Operator rebranded as "OneOcean Port Vell"; berths/max LOA match the graph's existing values exactly (151 / 190m), corroborating the existing entry. |
| Miami Beach Marina | USA | Miami Beach, FL | 400 | 76 | — | Yes (truck delivery + dock) | miamibeachmarina.com | Address: 300 Alton Rd, Miami Beach FL 33139. |
| ONE°15 Marina Sentosa Cove | Singapore | Sentosa Cove | 272 wet (32 megayacht) + 60 dry | 100 | — | Yes (9am–7pm) | one15marina.com | VHF 77. |
| Safe Harbor Rybovich | USA | West Palm Beach, FL | 85 slips to 100m + 10 dry to 59m | 100 | — | Yes | safeharbor.com/locations/safe-harbor-rybovich | (curated Marina cell from "Safe Harbor Rybovich (= "Rybovich Superyacht Marina" dup node)") Graph carries two duplicate nodes for this yard (`marina:rybovich-superyacht-marina` est. 1960, address 4200 N Flagler Dr; `marina:safe-harbor-rybovich` with phone) — dedup candidate, same facility, acquired by Safe Harbor 2021. |
| Safe Harbor Newport Shipyard | USA | Newport, RI | — (not found) | 91.4 (matches existing graph 300ft) | — | — (not confirmed) | safeharbor.com/locations/safe-harbor-newport-shipyard | Graph's existing `max_loa`/`travelift_tonnage` (500T) values corroborated by search; berth count and fuel dock left empty rather than guessed. |
| Safe Harbor Lauderdale Marine Center | USA | Fort Lauderdale, FL | — (not found) | 61 (matches existing graph shipyard-node value) | — | — (not confirmed) | safeharbor.com/locations/safe-harbor-lauderdale-marine-center | Largest yacht refit/repair facility in the US (65 acres) per Safe Harbor's own materials; primarily a refit yard, not a transient berth marina, hence sparse berth data industry-wide. |

## New marinas

| Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel Dock | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Port Hercule | Monaco | Monaco (La Condamine) | 700 (110 for 24m+, ~30 visitor) | 135–200 (sources vary; 135m commonly cited operational max) | 6.5 | Yes | — (state-run, no single official site found) | Managed by the Monaco government / Direction des Affaires Maritimes; hosts the Monaco Yacht Show. |
| Marina di Porto Cervo | Italy | Porto Cervo, Sardinia (Costa Smeralda) | 720 (100 for megayachts) | 160 | 8 | Yes | igymarinas.com/marinas/marina-di-porto-cervo | Managed by IGY Marinas since 2019 acquisition. |
| Yacht Haven Grande (USVI) | USVI (USA) | Charlotte Amalie, St Thomas | 46 megayacht berths | 200 | 7.6 | Yes (in-slip high-speed) | igymarinas.com/marinas/marina-yacht-haven-grande | Not to be confused with the graph's existing "Yacht Haven Marina" node (Pacific NW, from the Pacific Coast guide) — unrelated facility despite the similar name. |
| Yacht Haven Grande Miami at Island Gardens | USA | Watson Island, Miami, FL | 50 superyacht berths | 167 (550ft) | 8.2 | Yes | islandgardens.com | Operated by IGY; 7,000 linear ft of slips. |
| Port Vauban | France | Antibes | 1,500–1,654 (39 dedicated 30–70m superyacht berths) | 150–165 | 7 | Yes | leportvauban.com | Europe's largest yacht harbour by superyacht capacity; home of IYCA. |
| Yas Marina | UAE | Abu Dhabi (Yas Island) | 227 wet berths (8–90m) + visitor berths to 175m | 90 (inside marina); up to 150–175 on 525m visitor berth | — | Yes | yasmarina.ae | Air draft max 28m on approach. |
| Limassol Marina | Cyprus | Limassol | 680 | 110 (up to 115 on dedicated superyacht berths) | — | Yes | limassolmarina.com | Tel +357 25 020 020. |
| Porto Montenegro | Montenegro | Tivat | ~430–450 | 250 (min 12) | 15 (at fuel jetty) | Yes (Jetty 3, duty-free, ~800,000L capacity) | portomontenegro.com | VHF channel 71. |
| Bahia Mar Yachting Center | USA | Fort Lauderdale, FL | 250 slips (100 over 100ft) | ~91.4 (300ft) | 4 (13ft) | Yes (6 pumps, diesel/gas) | bahiamaryachtingcenter.com | 3,000ft parallel dock + 5,000ft floating docks. |
| Pier Sixty-Six Marina | USA | Fort Lauderdale, FL | 164 slips | ~122 (400ft) | 9 (30ft alongside) | Yes (diesel/gas, high-speed) | piersixtysixmarina.com | First fuel stop for vessels transiting to/from the Bahamas; zero bridge restrictions. |
| IGY Rodney Bay Marina | Saint Lucia | Rodney Bay, Castries | 253 (32 megayacht) | 87 (285ft) | 3.9 (13ft) | Yes (500 linear ft dock) | igymarinas.com/marinas/rodney-bay-marina | Max beam 18.3m. |
| IGY Blue Haven Marina | Turks and Caicos | Providenciales | 135 (5 megayacht, 30 superyacht) | 67+ (220ft+) | — (12ft access depth) | Yes (in-slip, only one in TCI) | bluehavenmarina.com |  |
| IGY Simpson Bay Marina | Sint Maarten | Simpson Bay | 122 (20 megayacht) | 57.5 (190ft) | 4 | — (not confirmed) | igymarinas.com/marinas/simpson-bay-marina | Max beam 10.4m. |
| IGY American Yacht Harbor | USVI (USA) | St Thomas (Vessup Bay) | 123–128 (4 megayacht) | 110–120 | — | Yes (high-speed pumps) | igymarinas.com/marinas/american-yacht-harbor |  |
| Marina Cabo San Lucas | Mexico | Cabo San Lucas, BCS | 380 (33 megayacht) | 114 (375ft) | 8.8 | Yes (high-speed) | igymarinas.com/marinas/marina-cabo-san-lucas-mexico | Max beam 19m. |
| Marina di Portofino | Italy | Portofino | ~14 large-berth (Molo Umberto I) + 2 megayacht moorings to 80m (Baia Cannone) | 80 | — | Yes (8am–7:30pm) | portofinoyachtmarina.com | Distinct from graph node "Portofino Hotel & Marina," which is in Redondo Beach, California, USA — same-sounding name, unrelated facility. |
| Port Camille Rayon | France | Golfe-Juan | 800+ (40 for 30m+) | 75 | 5 | — (not confirmed) | — | Between Antibes and Cannes. |
| Zea Marina (Marina Zeas) | Greece | Piraeus | 520 (range 504–670 across sources) | 150 | 8 | Yes (oil trucks) | d-marin.com/en/marinas/zea | Operated by D-Marin. |
| Puerto Banús | Spain | Marbella | 915 | 50 | — (3–6 inside, 7.5 at entrance) | Yes | puerto-banus.com |  |
| Yalıkavak Marina | Turkey | Bodrum | 620 | 140 | — | Yes (duty-free) | yalikavakmarina.com.tr | Port of entry with helipad; 1000A/3-phase shore power. |
| Dubai Harbour Marina | UAE | Dubai (Palm Jumeirah / Bluewaters) | 700 (combined Harbour + Bay Marina) | 160 | — (no air draft limit) | Yes | pnomarinas.com | Operated by P&O Marinas. |
| ACI Marina Dubrovnik | Croatia | Dubrovnik | 380 wet + 140 dry | 45–60 (sources vary) | 6 | Yes | aci-marinas.com/marina/aci-dubrovnik |  |
| Sanctuary Cove Marina | Australia | Gold Coast, QLD | ~380 (63 for superyachts once expansion complete) | 50 (165ft) | — | Yes (24/7) | sanctuarycove.com/marina |  |
| d'Albora Marinas Rushcutters Bay | Australia | Sydney, NSW | 106 | 40 | — | — (not confirmed) | dalbora.com.au/marinas/rushcutters-bay |  |
| Marina del Rey / Del Rey Landing | USA | Marina del Rey, CA | ~4,600 (harbour-wide); Del Rey Landing is the megayacht facility | 76 (250ft, Del Rey Landing) | — | Yes (direct-fill, 60 gpm x8) | delreylanding.com | Largest man-made small-boat harbor claim; Del Rey Landing is the mega-yacht-capable berth within it. |
| Nanny Cay Resort & Marina | BVI | Tortola | 300–320 (120 outer, 200 inner) | 42.7 (140ft, largest inner-marina slips) | — | Yes (2 fuel docks, 8am–5pm) | nannycay.com |  |
| Camper & Nicholsons Port Louis Marina | Grenada | St George's | 227 (30 superyacht, 30–110m) | 91.4 (300ft) | — | — (not confirmed) | cnmarinas.com/cn/marinas/port-louis-marina |  |
| Atlantis Marina | Bahamas | Paradise Island, Nassau | 63 megayacht slips | 76.2 (250ft) | — | — (not confirmed; contact direct) | atlantisbahamas.com/rooms/atlantis-marina | Largest slips: 220ft finger piers, 37ft beam. |
| Port de Saint-Tropez | France | Saint-Tropez | 734 (two basins, 9 ha) | 90 (Môle d'Estiennes d'Orves basin) | 4 (that basin) | — (not confirmed) | portsainttropez.com | Old Port berths 25–50m; Jean Lescudier basin to 25m. |
| Port Adriano | Spain | Calvià, Mallorca | 489 (87 for 20m+) | 80–100 (sources vary) | 7 | Yes | portadriano.com | 250-ton travelift, 11,000m² shipyard. |
| Real Club Náutico de Palma | Spain | Palma de Mallorca | 1,019 | 60 | — | — (not confirmed) | — (club site not confirmed) | One of the largest marinas in the Balearics by berth count. |
| Marina di Capri (Marina Grande) | Italy | Capri | 300 | 40 | — | Yes | portoturisticodicapri.com |  |
| D-Marin Göcek | Turkey | Göcek, Fethiye | 380 | 45–70 (sources vary) | — | Yes | d-marin.com/en/marinas/gocek | 75-ton travelift + 40-ton trailer on-site boatyard. |
| IGY Vieux-Port de Cannes | France | Cannes | 635 (58 dedicated superyacht) | 65 standard / 140 by special request | — | Yes | igymarinas.com/marinas/igy-vieux-port-de-cannes | Managed by IGY; undergoing modernization. |
| Port Pierre Canto | France | Cannes | 553–598 | 80–90 (sources vary) | 7 | — (not confirmed) | cannes.com/en/boating-beaches/ports-of-cannes/port-canto.html |  |
| Port Lympia | France | Nice | 520 (153 stopover) | 190 | 6 | Yes | leportdenice.com |  |
| Milta Bodrum Marina | Turkey | Bodrum | 450 (50 dry) | 75 | — | Yes | miltabodrummarina.com |  |
| Port de Gustavia | France (St Barthélemy) | Gustavia | ~100–152 | 60 (quay); anchorage for 150m+ offshore | — (13–16ft depth) | — (not confirmed) | — | Stern-to anchor-and-quay berthing, not fixed slips. |
| Aberdeen Marina Club | Hong Kong | Aberdeen | 170 | 30 | — | Yes | aberdeenmarinaclub.com | Private club marina. |
| Hebe Haven Yacht Club | Hong Kong | Sai Kung | 53 (+3 guest) | 18 (22 on visitor pontoons) | — | — (not confirmed) | hhyc.org.hk | Small-craft club, not a superyacht destination — included for completeness given HK relevance. |
| Old Bahama Bay Resort & Marina | Bahamas | West End, Grand Bahama | 63–72 | 36.6–39.6 (120–130ft, sources vary) | 2.4 (8ft MLW) | Yes (92 octane + diesel) | oldbahamabayresorts.com/marina | Only night-navigable port of entry on Grand Bahama. |
| Universal Marine Center | USA | Fort Lauderdale, FL | 22 | 61 (200ft) | — | Yes (diesel + non-ethanol gas) | — (site not directly confirmed) | 8 acres, 1,250ft waterfront. |
| RMK Merrill-Stevens | USA | Miami, FL | 100 (40 covered) | 91–150 (300–500ft, sources vary widely) | — | Yes | rmkmerrill-stevens.com | Historic Miami River yard, refit-focused. |
| Cable Marine (Cable West) | USA | Fort Lauderdale, FL | 24 | — (not found) | 12 (min depth) | — (not confirmed) | cablemarine.com | Boatyard/haul-out focus, not a transient marina. |

## Sources

See research/round3/marina-enrichment.md's own Sources section for the full per-marina citation list (mostly operator own-site pages, IGY Marinas, D-Marin, Safe Harbor Marinas).
