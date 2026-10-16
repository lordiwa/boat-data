# Vintage, Classic & Heritage Yachts — Taxonomy, Market Snapshot, and Brokers

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-03-21, subject "types of yachts - vintage - & insurance - !". Grok-generated research; the sender noted insurance was a separate work item._

Taxonomy path: Yachts > Vintage / Classic / Heritage.

## Core Definitions (2026 Standards)

### By era

- **Antique** (pre-1943; 1919–1942 per YachtWorld and ACBS)
  - Pre-1919 (Historic)
  - 1919–1942 (wood and metal hulls dominant, traditional rigs)
- **Classic** (1943–1975)
  - Early Classic (1943–1950s, mostly wood)
  - Mid-Classic (1960s, fiberglass transition)
  - Late Classic (1970s, aluminum and early GRP)
- **Vintage / Post-Classic** (1976 to roughly 25 years old, "modern classic" or Spirit of Tradition)
  - Heritage replicas: new builds to old lines (J-Class, Herreshoff)

### By material and construction

- Wooden (pre-1950s dominant; highest restoration value)
- Steel / metal
- Early fiberglass / GRP
- Aluminum (1970s onward)
- Hybrid / epoxy-sheathed (restored originals)

## For-Sale Dataset Structure

Attributes to ingest or scrape for every listing, suited to RAG, price-history tracking, commission forecasting, and queries like "vintage wooden yachts under $500k in Florida with under 180 days on market":

- Year built / launch date
- Builder / designer (Herreshoff, Sparkman & Stephens, Alden)
- Length / LOA / beam / draft / displacement
- Hull material plus restoration status (original, partial, full refit, project boat)
- Current asking price plus five-year price history
- Location, with a Florida flag for the year-round market
- Days on market (typically 180–720+ days for vintage versus 30–90 for modern)
- Provenance and history (race wins, famous owners, regatta eligibility)
- Commission potential (standard 10% seller-paid; split 50/50 house/broker or 75/25 in specialist firms)
- Maintenance records and survey status
- Regatta or charter eligibility (Antigua Classic, Dunkirk Little Ships)

## Market Snapshot (March 2026)

- Worldwide antique and classic sail listings: about 354 on YachtWorld alone, priced $9,900 to $7.5M+.
- Florida examples (year-round market thanks to warm climate, no winter lay-up, varnish and paint focus):
  - 1983 Islander Freeport, Apalachicola, FL, $75,000
  - 1986 Cherubini 44, Punta Gorda, FL, $285,000
  - 1973 Chanticleer, Florida, $9,900,000 (high-end classic)
- Other notables: 1939 EROS (Maine, $1.65M), 1928 Charm III (Anguilla, $350k), 1962 Fairmile (Spain, €1.2M).
- Trend: buyer's market in 2025–2026. More supply means longer sales cycles, but values hold versus new-build costs. Motor classics outsell sail in brokerage volume.

## Geography and Seasonality — Florida Year-Round Hub

- Primary Florida ports: Fort Lauderdale, Stuart, St. Augustine, Punta Gorda, Apalachicola.
- Why year-round: no freeze damage, constant sun (varnish and paint maintenance is the key cost), easy access to specialist yards, Palm Beach Boat Show timing.
- Winter storage is minimal compared with northern states.
- High inventory makes Florida the right real-time filter for the data lake.

## Top Players in the Market (who dominates commissions)

| Company Name | Description | Key Features |
|---|---|---|
| Sandeman Yacht Company | Pure classic and vintage brokerage focus: Herreshoff, schooners, motor yachts. | Specialist deep inventory; sandemanyachtcompany.com |
| Fraser Yachts | Larger classics, 24m+ crewed (e.g., Athos). | Off-market and public listings |
| Camper & Nicholsons | Historic brokerage powerhouse since 1782, strong in heritage vessels. | — |
| Berthon International | Classic motor yachts, trawlers, Grand Banks. | Off-market and public listings |
| Wooden Ships / Henley Sales & Charter | Traditional wooden yachts, river craft, Dunkirk Little Ships. | — |
| Bernard Gallay | Sail and power classics 10–18m. | — |
| Classic Boat Collective / Veteran Yacht Sales | Dedicated antique motor and sail brokerage. | classicboatcollective.com |
| Stephens Waring | Modern classics and Spirit of Tradition new builds plus refits. | — |

## Scrape / Ingest Sites

Public listing sites to structure crawlers, RSS, or API pulls around the fields above:

- YachtWorld.com (Antique & Classic filter; best volume, Florida-heavy)
- Classic-YachtsForSale.com (curated, 25+ high-end)
- ClassicBoatCollective.com
- AntiqueBoatAmerica.com (free listings, antique focus)
- SandemanYachtCompany.com
- Yatco.com (official MLS, vintage section)
- BoatTrader.com (Florida antique and classic power and sail)
- ACBS.org classifieds
- Berthon, Fraser, Northrop & Johnson (off-market plus public)

## Why This Vertical Earns Commission

Vintage and classic yachts average longer days on market than modern production boats. Buyers are passionate but picky about surveys, provenance, and restoration costs. Brokers with networks of yards, regatta clubs, and owner communities close the rare deals at the full 10% (sometimes 8% above $1M). The research estimated this adds roughly 400 leaf subcategories (eras × materials × restoration × geography × for-sale status × broker networks), taking the yacht vertical past 1,200 paths.
