# Florida Marina Categories, Haul-Out Capability, and the Racing-History Intelligence Layer

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-10-10, subject "Where can I dock in Florida, fuel, clear customs, haul out for bottom paint, and find a marina with real offshore-racing history?". Perplexity-generated design brief for a marine-infrastructure intelligence layer._

The brief: build a layer that explains who can use a facility, what it can lift, what it costs, what it restricts, and why South Florida's marina culture became intertwined with offshore racing and the Cocaine Cowboys era.

## Facility Categories

| Category | What It Is | Who It Serves | Key Data to Publish |
|---|---|---|---|
| Wet-slip marina | Boat stays in the water at a dock, finger pier, or float | Recreational boaters, cruisers, sportfish, yachts | Slip length, beam, draft, power, water, liveaboard policy |
| Dry-stack marina | Boat stored in a covered rack and launched by forklift or crane | 20–45 ft powerboats, center consoles | Max boat size, launch hours, forklift capacity, queue times |
| Dry-storage yard | Boat stored ashore on trailer, cradle, or stands | Trailer boaters, seasonal owners | Trailer parking, launch ramp, mast and beam limits |
| Yacht basin | High-end marina built around larger yachts, often with concierge services and deeper dockage | 80–300 ft yachts | Max LOA, draft, shore power, customs, security |
| Superyacht marina | Deep-water facility for large yachts, high-amperage power, no bridge restrictions | 150–550 ft yachts | Max LOA, air draft, beam, power, fuel, security |
| Boatyard / service yard | Hauls, stores, repairs, paints, and launches vessels | Owners needing maintenance or refit | Travel-lift capacity, draft limit, paint shed, technicians |
| Full-service shipyard | Large industrial yard with heavy lifting, fabrication, engineering, major refit | Superyachts and commercial vessels | Dry dock, gantry crane, certifications, project capacity |
| Municipal marina | City or county-owned, often public access and lower-cost dockage | Local boaters, transients | Resident vs transient rates, waitlist, public ramp |
| Private club marina | Members-only yacht club or country-club marina | Members and invited guests | Membership rules, guest privileges |
| Military marina | Base marina for authorized personnel | Military ID holders | Eligibility, access rules |
| Fuel dock | Fueling facility, sometimes attached to a marina | All passing vessels | Fuel types, hours, depth, max LOA |
| Public boat ramp | Public launch with trailer parking | Trailer boaters | Spaces, fees, permit rules, overnight policy |

## Who Can Haul Out

A haul-out lifts a vessel from the water for inspection, cleaning, bottom paint, repair, storage, or refit, using a travel lift, crane, hydraulic trailer, slipway trailer, or marine railway.

| Vessel Size | Typical Haul-Out Method | Who Can Use It |
|---|---|---|
| Under 30 ft | Forklift, hydraulic trailer, small travel lift | Trailer boaters, dry-stack customers |
| 30–60 ft | Travel lift | Most recreational yachts and sportfish |
| 60–100 ft | Large travel lift or crane | Yachts, sportfish, smaller commercial vessels |
| 100–150 ft | High-capacity travel lift | Large yachts where beam, draft, and weight allow |
| 150 ft+ | Marine railway, Syncrolift, floating dry dock, or heavy gantry | Superyachts and ships |
| 200 ft+ | Floating dry dock or major shipyard | Superyachts, expedition yachts, commercial vessels |

A travel lift is the standard modern method: a mobile rubber-tired gantry straddles the boat, places slings under the hull, lifts it, and drives it to a yard position; commonly used for yachts up to roughly 150 ft and 500 tons. For larger vessels a marine railway uses a cradle on rails hauled up an inclined slipway; floating dry docks and Syncrolift platforms handle vessels too large for a travel lift.

### Lift and yard capability fields to publish

haul_out_methods (travel lift, crane, marine railway, Syncrolift, floating dry dock); max_lift_capacity_tons; max_loa_ft; max_beam_ft; max_draft_ft; max_air_draft_ft; paint_shed (yes/no, dimensions); hardstand_capacity; bottom_paint; fiberglass_repair; metal_fabrication; engine_service; electronics; surveyor_access; insurance_work; hurricane_haulout_priority.

Example benchmark record: Safe Harbor Rybovich. Haul-out via travel lift, marine railway, floating dry dock; max yacht 450 ft; max draft 25 ft; full superyacht refit yard; status VERIFIED. It is the benchmark because it combines a superyacht marina with a major service yard.

## Old School versus Modern Superyacht Facilities

**Old-school Florida marina:** practical, local, often family-run. Wooden docks and simple finger piers, manual fuel pumps, small travel lifts or marine railways, working boatyards beside the docks, local mechanics and canvas and fiberglass shops, first-come transient slips, little online booking, word-of-mouth reputation, strong ties to fishing, diving, and offshore racing. Still the culture around many working waterfronts in the Keys, Fort Myers, St. Petersburg, and parts of the Panhandle.

**Modern superyacht marina:** closer to a five-star hotel for yachts. Concrete floating docks, 400-amp or higher shore power, high-speed fueling, customs and immigration support, concierge, provisioning and crew services, security and gated access, online booking and real-time availability, hurricane plans and insurance compliance, deep-water access with no bridge restrictions. Pier Sixty-Six is the example: 164 slips, 5,000 linear feet of dockage, and 1,200 amps at every pedestal.

**Editorial series: "Old School to Superyacht."** For each marina show year founded or oldest known operation; original use (fishing, charter, boatyard, smuggler-era harbor, yacht club); what it looked like in the 1960s–1980s; what it is today; what it can haul out; who it serves now.

## Offshore Powerboat Racing: The Florida Connection

South Florida's offshore-racing culture and marina culture grew together. Don Aronow founded Formula Marine in Miami in 1962, developed the Formula 233, and created Cigarette Racing Team in 1970. The connection to the Cocaine Cowboys era is real but must be handled carefully: journalist John Crouse called the offshore racing machine "the catalyst for the major drug movement in the United States," and reporting describes smugglers using speedboats to move cocaine from the Bahamas to Florida. The pattern was "race by day, run at night": smugglers spent drug money on racing, high-performance boats became both tools and status symbols, and the Coast Guard had to develop its own go-fast boats.

**Cover it responsibly** as history and culture, not glorification: Prohibition-era Bimini boats and rum-running; the rise of Miami–Nassau racing in 1956; Aronow, Formula, Donzi, Magnum, and Cigarette; the 1970s–1980s offshore boom; the Cocaine Cowboys era as documented history; how law enforcement, Coast Guard interdiction, and marine technology evolved. Focus on boats, engineering, racing, ports, and Miami's social history.

Suggested URL set: datayacht.com/florida/marine-history with children rum-running, offshore-powerboat-racing, don-aronow, cigarette-racing, cocaine-cowboys-era, miami-nassau, thunderboat-row, coast-guard-go-fast-boats.

## The DataYacht Advantage over Wikipedia: A Decision System

1. **Capability intelligence.** For every marina and yard: can it dock, fuel, haul, repair, store during hurricane season, handle my tender, clear customs? Is there a bridge restriction? Overnight trailer parking?
2. **Historical intelligence.** Founding era, original commercial use, racing history, documented smuggling-era relevance, famous boats and builders, Coast Guard history, modern transformation.
3. **Operational intelligence.** Live or frequently updated: fuel price, dockage availability, travel-lift queue, hurricane haul-out status, bridge closure alerts, ramp capacity, weather risk, customs wait times.
4. **Verification intelligence.** Every record shows VERIFIED | PENDING | USER REPORTED | RESTRICTED | CLOSED, plus last_verified date, source (official marina site, county, FWC, DEP), and a correction link.

### Master category map

datayacht.com/florida/marinas with children wet-slips, dry-stack, dry-storage, yacht-basins, superyacht-marinas, boatyards, shipyards, fuel-docks, public-ramps, municipal-marinas, private-marinas, military-marinas, haul-out; each connected to the marine-history pages above.

**The big idea.** Someone should be able to ask: "I have a 120-foot yacht. Where can I dock in Florida, fuel, clear customs, haul out for bottom paint, and find a marina with real offshore-racing history?" Wikipedia cannot answer that in one place. The formula is marina data + haul-out capability + Florida racing history + Cocaine Cowboys-era context + verified live operational data.
