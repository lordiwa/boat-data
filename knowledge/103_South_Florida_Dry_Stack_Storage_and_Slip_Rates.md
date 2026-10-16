# South Florida Dry-Stack Storage Buildings and Slip Rental Rates

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-10-10, subject "South Florida–focused breakdown for on-shore yacht storage buildings (dry stack/boatels), plus slip rentals and sales, organized so you can plug it into datayacht.com as a structured report". Perplexity-generated research. The email was truncated in the slip-rental listings section._

## On-Shore Yacht Storage Buildings (Dry Stack / "Boatel" Facilities)

Purpose-built multi-story or high-bay structures that store yachts on racks indoors or under cover, typically with valet launch and retrieval.

| Facility Name | Location | Max LOA | Berths | Website | Notes |
|---|---|---|---|---|---|
| The Port Marina | Fort Lauderdale, FL | 52 ft | 240 | yachtservice.vip/marina/the-port-marina-fort-lauderdale | 1801 SE 17th Street, Fort Lauderdale, FL 33316. Automated dry stack with laser-guided overhead crane; four-level steel and concrete structure; about 240 racks; vessels to roughly 30,000+ lbs, some racks limited to 42 ft on the west wall. Hurricane-rated, about 3-minute launch and retrieval, covered parking, concierge services; five minutes to Port Everglades inlet. |
| F3 Marina Fort Lauderdale | Fort Lauderdale, FL | 43 ft | 240 | f3marinafl.com | Just off the 17th Street Causeway. Fully automated dry stack, one of the first in the US; 240 racks; max 43 ft LOA, 13 ft beam, 17 ft height, 30,000 lbs wet weight. Hurricane-rated, direct Intracoastal access, minutes to the Atlantic. |
| PORT 32 Fort Lauderdale Drystack | Fort Lauderdale, FL | 55 ft | 240 | port32fortlauderdale.com/drystack | 1915 SW 21st Avenue on the New River near I-95. Valet dry stack; 240+ dry slips; vessels to 55 ft. Structure designed to about 175 mph winds; long and short-term dry tender storage; in-water service slips up to 150 ft also offered. |
| Haulover Marine Center | North Miami Beach, FL | — | 488 | haulovermarinecenter.com | Bakers Haulover Inlet on the Intracoastal between Sunny Isles and Bal Harbour. Enclosed, Category 5 hurricane-rated dry storage building; 488 dry storage spaces; direct Intracoastal access at a major inlet; high-end service environment. |
| TNT Marine Center | North Miami, FL | 52 ft | — | tntmarinecenter.com | 1940 NE 135th Street, North Miami, FL 33181. Indoor dry storage plus wet slips; long-term indoor dry storage; transient and long-term wet slips up to 52 ft; fuel, ship store, cleaning services. Rack count not published. |
| Meridian Marina | Palm City, FL | 45 ft | 540 | meridianmarina.com | Martin County, St. Lucie River. Existing 62,000 sq ft covered dry storage barn with about 260 racks; adding 140 outdoor dry racks and a new 140-slip Category 5 rated barn to reach about 540 total racks. Covered barn takes boats to 45 ft. Often included in South Florida storage analyses because of demand spillover. |
| Marina One | Deerfield Beach, FL | 50 ft | 500 | marinaone.com/boat-storage | 580 N Federal Highway, Deerfield Beach, FL 33441. Two dry-rack buildings (East or Yacht Club, and West); up to 500 boats in dry-rack storage; dry stack to about 50 ft for low-profile, narrow-beam boats; in-water slips to 65 ft. Intracoastal access with no fixed bridges from the East Building; budget-friendly West Building for smaller boats. |
| Safe Harbor Rybovich Riviera Beach | Riviera Beach, FL | 250 ft | — | — | Greater Fort Lauderdale to Palm Beach yacht service corridor. New 44,054 sq ft three-story Trade Building opened September 2026 (Hedrick Brothers Construction) with trade and office space supporting superyacht service; adjacent boatyard hardened and expanded for very large yachts with a mobile lift for yachts up to about 250 ft; about 150,695 sq ft of hardstanding referenced for the broader complex. More a service and haul-out campus than a pure rack dry stack. |

### Typical design and operating characteristics (for the data model)

- Structures: 3 to 8 levels high; enclosed or covered steel buildings; clear heights often 25 to 40+ ft depending on levels.
- Systems: forklift-based racks in many facilities; automated crane systems in premium "boatel" projects (The Port Marina, F3).
- Footprint logic: capacity depends on boat dimensions, rack configuration, aisle widths, and handling equipment; multi-tier racks dramatically increase boats per square foot versus wet slips.
- Hurricane resilience: many newer South Florida dry stacks are explicitly rated for high wind loads (175 mph, Category 5).
- Suggested CSV schema: facility_name, city, type, racks, max_loa_ft, max_weight_lbs, building_sqft, automation_level, year_built.

## Slip Rentals (Wet Dockage) — South Florida Pricing Landscape

Rates are almost always quoted per foot of slip length per month, with surcharges for liveaboard, utilities, and premium locations.

### Typical 2026 monthly rates (per foot)

- **South Florida overall (Miami, Fort Lauderdale, Palm Beach):** general range $20–$50 per ft per month for standard marinas; premium and ultra-luxury locations $45–$100+ per ft per month (Miami Beach Marina, Island Gardens, some Brickell and Key Biscayne marinas).
- **Miami:** typically $25–$60+ per ft per month; luxury marinas can exceed $60–$100+. Example monthly totals: 30 ft boat about $750–$1,800; 40 ft boat about $1,000–$2,400; 50 ft boat about $1,250–$3,000+.
- **Fort Lauderdale / Palm Beach corridor:** often $20–$40 per ft per month at many Intracoastal and river marinas; top waterfront projects and new condo-marinas push higher.
- **City of Miami public marinas (reference rate sheet):** published monthly rate example of $52 per ft per month for certain categories; long-term non-liveaboard around $27.50 per ft per month; liveaboard around $33.50 per ft per month; rack storage rates in the high $20s per ft per month.

### Additional common charges

- Liveaboard surcharge: commonly $150–$300 per month extra on Florida's East Coast.
- Utilities: electricity (shore power), water, pump-out, Wi-Fi, and parking often billed separately or as package add-ons.
- Slip size versus boat length: you typically pay for the slip length, not just the boat (a 37 ft yacht may need a 45 ft slip).

### Representative rental listings

Platforms such as Docksearch and YachtBazar show active South Florida listings such as:

- Miami: 30 ft slips around $1,100–$1,200 per month
- Fort Lauderdale: 30 ft slips about $1,500 per month; 80 ft slips about $3,300 per month

_The source email was truncated after these listings; the slip sales section was not received._
