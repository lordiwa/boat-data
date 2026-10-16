# Florida Statewide Maritime Data Architecture

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-10-12, subject "Ai. Food. F L O R I D A datayacht.com", forwarding a message from Andres Agama (pcando2529@gmail.com) dated 2026-10-12. Perplexity-generated architecture brief, the Florida counterpart to the Italy brief in file 108._

## Positioning

Build DataYacht for Florida as a statewide maritime data system with regional landing pages plus reusable dataset pages. Florida's public sources are strong for tides, marine forecasts, boating restrictions, harmful algal blooms, public boat ramps, storm information, and port directories. Live marina berths, fuel prices, and comprehensive yacht or AIS tracking will likely require direct feeds or commercial partners.

## Florida URL Structure

Use geography as the organizing layer, attach topic pages under each region, keep dataset records under /data/ and consumer-facing destination pages under /places/.

- /florida/regions/{florida-keys, south-florida, treasure-coast, space-coast, first-coast, emerald-coast, tampa-bay, charlotte-harbor, naples-everglades, big-bend}/
- /florida/{ports, marinas, boat-ramps, marine-weather, tides-and-currents, boating-rules, water-quality, hurricanes}/
- /data/florida/{tides, currents, marine-weather, ports, port-traffic, vessel-traffic, boating-restrictions, manatee-zones, marine-protected-areas, red-tide, beach-water-quality, boat-ramps, storms, datasets}/
- /data/regions/{region}/{topic}/
- /ports/{port-slug}/, /marinas/{marina-slug}/, /ramps/{ramp-slug}/, /places/{destination-slug}/, /routes/{route-slug}/

## Florida Zones and Data Ideas

These regions are editorial and product groupings, not official state administrative regions. A port, inlet, or weather zone may cross a tourism-region boundary, so each record carries coordinates and an explicit geographic scope.

| Region / Zone | Key Places | High-Value Data |
|---|---|---|
| Florida Keys and Dry Tortugas | Key Largo, Islamorada, Marathon, Key West, Dry Tortugas | NOAA tides and currents; NWS marine forecasts; FWC and NOAA sanctuary zones and rules; no-anchor and no-wake zones; reef and protected-area boundaries; red tide and water quality; ramps and marinas; hurricane alerts and port status |
| South Florida and Gold Coast | Miami, Biscayne Bay, Fort Lauderdale, Port Everglades, Boca Raton, Palm Beach | Port calls and statistics; marine forecasts; tide and current stations; manatee and boating restriction zones; marina directory; cruise schedules and port status; beach water-quality advisories |
| Treasure Coast | Stuart, Fort Pierce, Vero Beach, Sebastian | Inlets, ramps, marinas, tide and current stations, NWS coastal forecasts, manatee zones, beach conditions, navigation restrictions, storm surge and flood exposure |
| Space Coast | Cape Canaveral, Cocoa Beach, Port Canaveral, Melbourne | Port Canaveral statistics and schedules; inlet and coastal conditions; NOAA tide and current data; ramp and marina inventory; verified launch and event calendar; storm and port status |
| First Coast and Northeast Florida | Jacksonville, St. Augustine, Fernandina Beach, Amelia Island | JAXPORT and local port information; river, inlet, and coastal forecasts; buoy observations; public ramps; port traffic statistics; storm and closure notices |
| Emerald Coast and Panhandle | Pensacola, Destin, Panama City, Port St. Joe, Apalachicola | Gulf marine forecasts, buoy data, tides and currents, port directories and statistics, boat ramps, protected-area boundaries, beach advisories, hurricane products |
| Tampa Bay and Suncoast | Tampa, St. Petersburg, Clearwater, Tarpon Springs | Port Tampa Bay information and statistics; Tampa Bay and Gulf forecasts; tide and current stations; ramps and marinas; boating restrictions; red tide and HAB monitoring; beach water quality |
| Charlotte Harbor and Southwest Florida | Punta Gorda, Boca Grande, Fort Myers, Sanibel, Captiva | Estuary and coastal forecasts; tide and current stations; manatee zones; ramps and marinas; red tide and water quality; protected-area and habitat layers; ferry and public-service links |
| Naples and Everglades | Naples, Marco Island, Everglades City, Ten Thousand Islands | Gulf and Florida Bay forecasts; tide and current stations; protected areas and access rules; manatee zones; ramps, marinas, launch points; red tide; storm and coastal-flood information |
| Big Bend and Nature Coast | Cedar Key, Steinhatchee, Crystal River, Homosassa | Shallow-water access notes, tide stations, marine forecasts, boat ramps, manatee protections, wildlife areas, storm alerts, water-quality monitoring |

## Statewide Dataset Catalog

**Tides, currents, and coastal levels.** NOAA CO-OPS water-level observations, tide predictions, datums, currents, meteorological observations, station metadata; station status and freshness with preliminary versus quality-controlled labels; historical extremes and sea-level trends; nearshore modeled series clearly labeled as modeled. NOAA documents API access in JSON, CSV, and XML. Paths: /data/florida/tides/, /data/florida/currents/, /data/florida/water-levels/.

**Marine weather and navigation conditions.** NWS coastal and offshore forecasts by zone; wind, gusts, wave height and period, visibility, thunderstorms, warnings; buoy and coastal station observations; NOAA nowcast and forecast products where coverage exists. Do not imply every Florida waterway has equal model coverage. Paths: /data/florida/marine-weather/, /data/regions/florida-keys/sea-state/, /data/regions/tampa-bay/wind-and-waves/.

**Ports, shipping, and vessel movement.** Statewide port directory with coordinates, authority, contacts, type; port traffic totals (passenger, cargo, tonnage, TEUs, petroleum) where published; cruise schedules and port status from each authority; AIS products only if license and refresh behavior are confirmed; congestion indicators only from a reproducible measure. Florida DOT identifies 16 publicly owned seaports and provides a port-status resource; NOAA Digital Coast provides AIS transit-count products whose coverage, vintage, and reuse terms must be checked. Paths: /data/florida/ports/, /data/florida/port-traffic/, /data/florida/vessel-traffic/.

**Boating rules and protected waters.** FWC boating restricted areas, no-wake and idle-speed areas; manatee protection zones and seasonal rules; Florida Keys National Marine Sanctuary boundaries and zone restrictions; state and federal protected-area boundaries with regulation links; local ordinances only with a tracked legal source and effective date. FWC's manatee layer is a general-reference representation; the regulation text prevails if map and rule conflict. Paths: /data/florida/boating-restrictions/, /data/florida/manatee-zones/, /data/florida/marine-protected-areas/.

**Red tide, HABs, and water quality.** FWC harmful algal bloom sample locations, organism counts, water measurements; monitoring map and status reports with sample time and caveats; county beach bacteria results and advisories; nutrients, dissolved oxygen, salinity, chlorophyll, clarity where a monitoring program publishes them. FWC's HAB database records Karenia brevis and other blooms from 1953 to the present (200,000+ records, updated daily); its public map shows the most recent eight days. Florida Healthy Beaches results are posted by county. Keep "sampled result" distinct from "current condition". Paths: /data/florida/red-tide/, /data/florida/beach-water-quality/, /data/regions/tampa-bay/water-quality/.

**Boat access and local services.** Public boat ramps with location, waterbody, launch type, parking, fee, accessibility, official status link; marina and yacht-service directory with location, contact, services, booking link, last verified date; fuel, repair, pump-out, provisioning, haul-out, emergency listings; ferry and water-taxi services. Do not label ramp status, marina availability, or fuel price as live without an authoritative feed. FWC's Boat Ramp Finder is the most current information provided to it; verify locally. Paths: /data/florida/boat-ramps/, /florida/marinas/, /marinas/{marina-slug}/.

**Hurricanes, floods, and port operations.** Active tropical cyclone tracks, cones, watches and warnings, storm-surge products; county evacuation zones and routes; NOAA tide-gauge flood status and inundation history; port opening and closure status from port authorities and the Coast Guard; long-term sea-level-rise and flood-vulnerability layers (Resilient Florida) clearly separated from short-term forecasts. Paths: /data/florida/storms/, /data/florida/port-status/, /data/florida/flood-risk/.

## Example Florida Tide Dataset Schema

Use the Venice pattern (file 108) but account for multiple NOAA stations with distinct datums and product availability. Dataset id florida-coops-tides; publisher NOAA Center for Operational Oceanographic Products and Services; source https://tidesandcurrents.noaa.gov/; API https://api.tidesandcurrents.noaa.gov/api/prod/; station metadata API https://api.tidesandcurrents.noaa.gov/mdapi/prod/; formats JSON, CSV, XML; observation types verified_water_level, preliminary_water_level, tide_prediction; display timezone local station timezone; store station datum and product datum explicitly. Caveats: not every station provides every product; preliminary and quality-controlled readings must be labeled separately; station datums differ, so do not combine levels without normalization; show source observation time and retrieval time separately.

```json
{ "record_type": "water_level_observation", "dataset_id": "florida-coops-tides", "station_id": "NOAA-station-id", "station_name": null, "observed_at": null, "retrieved_at": null, "latitude": null, "longitude": null, "water_level": null, "unit": null, "datum": null, "quality_status": "preliminary_or_verified", "source_product": null, "source_url": null }
```

```json
{ "record_type": "tide_prediction", "dataset_id": "florida-coops-tides", "station_id": "NOAA-station-id", "predicted_for": null, "prediction_generated_at": null, "water_level": null, "unit": null, "datum": null, "prediction_type": "high_low_or_time_series", "source_url": null }
```

```json
{ "record_type": "station", "station_id": "NOAA-station-id", "name": null, "latitude": null, "longitude": null, "state": "Florida", "waterbody": null, "station_type": null, "available_products": [], "available_datums": [], "status": null, "metadata_source_url": null, "last_verified_at": null }
```

API pattern: GET /api/v1/florida/tides/stations; GET /api/v1/florida/tides/observations?station_id={id}&from={ISO-8601}&to={ISO-8601}; GET /api/v1/florida/tides/predictions?...; GET /api/v1/florida/marine-weather/?region={region}; GET /api/v1/florida/boating-restrictions/?lat={lat}&lon={lon}; GET /api/v1/florida/red-tide/?region={region}. Every response includes source, station or feature ID, units, datum where relevant, source time, retrieval time, and quality status. Maps and dashboards query the same normalized records as the API.

## Statewide Page Template

For each region or port: current conditions (latest tide, forecast, warnings, water-quality alerts, each timestamped); map (stations, ramps, ports, marinas, restricted waters, protected areas); navigation rules with effective dates; port and marina directory with operator links; dataset cards (coverage, publisher, freshness, date range, access format, limits); nearby destinations; safety note that DataYacht is informational with links to official navigation, weather, and emergency sources.

## Best Launch Sequence

1. Build the statewide geographic foundation: port directory, NOAA station index, FWC restricted-area layers, public boat ramps.
2. Launch conditions pages: tide and marine-weather dashboards with timestamps and coverage disclosed.
3. Add high-utility environmental data: red-tide sampling and beach-water advisories with sample dates and county coverage.
4. Create port pages, starting with Jacksonville, Port Canaveral, Port Everglades, Miami, Palm Beach, Tampa Bay, Key West, and Pensacola.
5. Pursue data partnerships: AIS, berth availability, marina prices, and fuel prices labeled "planned" or "partner data" until supported by an authorized source.

The most defensible differentiator is a source-transparent local maritime dashboard: conditions plus nearby access, restrictions, port facts, and environmental status, all timestamped and linked to the authority behind each item.
