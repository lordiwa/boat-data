# US and Europe Marina Data Sources — Why There Is No National Registry

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-10-15, subject "Data. To. Feed. Ai. Please. nationalmarinadatabase.com have a good laugh". Grok and Gemini-generated answers to "is there a national list of marinas on US soil or Europe, and what are the best data sets". Dave's own verdict on nationalmarinadatabase.com: "weak"._

## Is There a National Marina List? No single authoritative registry; it is a patchwork.

| Source | Scope | What It Covers | Limitation |
|---|---|---|---|
| National Marina Database (nationalmarinadatabase.com) | National, 21,000+ listings, 50 states | Marinas plus public boat launches, GPS, contacts, amenities | Crowdsourced-style listings; mixes marinas with yacht clubs, restaurants, fuel docks |
| NOAA Marine Cadastre | National | Ocean planning data, infrastructure, boundaries | Not marina-specific; broader marine infrastructure |
| NOAA MPA Inventory | National, 1,600+ sites | Marine protected areas | Conservation-focused, not docking |
| State DBW / OSMB / RCO databases | State-level | Official facility inventories per state | Fragmented, different schemas per state |
| URI Sea Grant historical inventory | National, 10,669 facilities (1985) | Marinas, boatyards, dockominiums, yacht clubs | Historical, not maintained |
| Commercial directories (Marinas.com, MarinaSeeker, etc.) | National | Aggregated listings | Duplicate and inconsistent, no verification standard |

**Key finding:** the closest thing to a national inventory was a 1985 University of Rhode Island Sea Grant project that counted 10,669 facilities (NOAA repository document noaa_43274). It was a one-time snapshot; nothing has replaced it as a maintained, authoritative registry.

**Why it is a patchwork:** no federal mandate (unlike FAA airports or USCG stations); state-by-state ownership (California DBW, Oregon OSMB, Washington RCO/WPPA, each with different schemas and update cycles); a private versus public split with no reporting obligation; and directory aggregation that creates duplicates and misclassifications (the 769 California listings on National Marina Database that included restaurants and yacht clubs).

## How DataYacht Captures the Whitespace

| Layer | What DataYacht Would Do | Why It Wins |
|---|---|---|
| Ingest | Pull from all state databases (DBW, OSMB, RCO) plus commercial directories | Covers the patchwork |
| Deduplicate | Match on lat/lon plus name plus operator to merge duplicates | Fixes the 769-listings-versus-real-marinas problem |
| Classify | Tag each record: marina, yacht club, fuel dock, restaurant, boatyard | Separates real docking from noise |
| Verify | Cross-check slip counts against each marina's own site | Beats directories that only aggregate |
| Standardize | One schema across all 50 states | Fixes the fragmented state-by-state problem |
| Maintain | Refresh cycle, correction submissions, change tracking | Beats the 1985 one-time snapshot |

DataYacht would be the first unified, verified, deduplicated national marina registry: what URI Sea Grant did in 1985, but live, maintained, and machine-readable. The moat is cleaning and certifying the data, not just aggregating it.

## Leading Directories

**United States**

- Marinas.com (marinas.com/browse/marina/US): the most comprehensive global cruising guide and digital directory for the US coastline, with interactive mapping, crowd-sourced reviews, and contact details by state.
- Waterway Guide (waterwayguide.com/directory/marina): trusted resource tracking marinas, fuel pricing, navigation alerts, and transient policies across the US coast, Great Lakes, and inland rivers.
- MarinaSeeker (marinaseeker.com): commercial index of more than 9,200 active marinas filtered by amenities, haul-out capacity, and transient docking.
- Dockwa Partner Network (blog.dockwa.com/all-652-dockwa-partner-marinas): a booking ledger that doubles as a list of marinas where transients can reserve slips online.
- Navy MWR Marinas (navymwr.org/programs/marinas): official directory of recreational marinas on naval installations.

**Europe**

- TransEurope Marinas (transeuropemarinas.com/marinas): the continent's most extensive cross-border network, close to 80 facilities across 12 countries including France, Spain, Germany, the UK, and Italy.
- Profinautic Ports Directory (profinautic.com/en/marinas/ports): hundreds of yacht clubs, commercial ports, and berthing structures across the Baltic, Mediterranean, and inland waterways.
- Harbour Guides (harbourguides.com/harbours/Europe): coastal blueprint for independent harbors and marinas across the UK and continental Europe.
- Imray Explore: traditional pilot books compiled into a digital chart application, the preferred structural database used by European sailors.

## Best Datasets Compared

Because there is no master list, data splits into business and corporate datasets (sales, outreach, B2B marketing) and geospatial and navigation datasets (GIS, software, logistics).

| Dataset Provider | Regional Coverage | Best For | Data Format | Key Characteristics |
|---|---|---|---|---|
| CompanyData.com US Marinas | United States (18,000+ entries) | B2B outreach and lead generation | Excel / CSV / API | Aggregated from Secretary of State registers; includes phone numbers, emails, estimated revenue, executive contacts |
| Xtract.io Marina GIS Data | United States and Canada | GIS mapping and real estate | Spatial geodatabase / polygon | High-precision coastal infrastructure data with exact geospatial boundaries of docks, slips, and surrounding POIs |
| Datalastic Static Ports Database | Global (US and Europe heavy) | Logistics and app development | CSV / Excel / API | Over 20,000 marine facilities globally, filterable to "marina" or "seaport" with precise coordinates |
| UNECE UN/LOCODE Database | US and EU, cross-continental | Academic research and logistics | Open-source CSV | Official international standard; five-character location codes for ports, terminals, and large commercial marinas |
| EMODnet Human Activities Portal | European Union | Public policy and environmental GIS | Open-access web GIS / shapefiles | Backed by the European Commission; maps maritime infrastructure, docks, and coastal activity under FAIR open-data guidelines |

**Which to choose:** for an application or map, Datalastic or Xtract.io (clean, normalized coordinates); for marketing to marina owners, a corporate database like CompanyData (public datasets omit phone numbers, revenue, decision-makers); for free open-source compliance data, UN/LOCODE.

**Bottom line:** there is no official master list because marinas cross categories (private businesses, municipal city docks, military facilities) and no single body maintains a definitive index. Choose a business list or a navigation list depending on what you are building.
