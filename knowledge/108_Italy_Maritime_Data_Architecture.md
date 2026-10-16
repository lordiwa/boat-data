# Italy Maritime Data Architecture — URL Structure, Zones, Catalog, and Venice Tides Schema

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-10-12, subject "Feed. Into. Your. A i. Please. : more data on >Italy Brother READY TO GO DATA". Perplexity-generated architecture brief. The email was truncated in the Venice forecast-record section._

## Positioning

The best version of DataYacht is a maritime intelligence and destination-data site: vessel activity, ports and marinas, navigation conditions, transport, regulations, and local points of interest. Keep a clear distinction between live data, forecasts, historical statistics, and curated guide content. Never label a feed "live" or a metric "anchorage wait time" unless a source actually provides it.

Italy's foundation: the Ministry of Infrastructure and Transport (MIT) publishes a geolocated register of 351 principal ports; ISPRA provides marine and coastal data including tide observations and forecasts; national marine forecasts cover waves and sea state; Venice has a municipal tide service; ACTV publishes transport information. Confirm feed terms and freshness before building live features.

## Recommended URL Structure

Use /data/ as the canonical namespace for datasets and dashboards, with geographic context before the metric.

- /italy/ and /italy/regions/{veneto, liguria, campania, sardinia, tuscany, lazio, friuli-venezia-giulia, marche, apulia}/
- /data/italy/{ports, vessels, marinas, marine-weather, protected-areas, datasets}/
- /data/venice/{tides, mose, vaporetto, vessel-traffic, navigation, marinas, closures, datasets}/
- /data/regions/{region}/{topic}/ for region-specific data (e.g., /data/regions/liguria/sea-state/)
- /places/{venice, portofino, porto-cervo, capri}/
- /ports/{port-slug}/, /marinas/{marina-slug}/, /routes/{route-slug}/

Avoid putting every topic in one generic /data/italy/regions/ folder; use that path for region landing pages only.

## Data Ideas by Zone

| Region / Zone | Local Coverage | Data to Aggregate | Useful Pages |
|---|---|---|---|
| Venice and Lagoon | Grand Canal, San Marco, Murano, Burano, Lido, Malamocco and lagoon inlets | Tide observations and forecasts; high-water alerts; MOSE status where officially published; weather and sea state; ACTV routes, stops, timetables, service changes; port and marina details; navigation notices, closures, restricted areas, speed rules; vessel positions only from a licensed feed | /data/venice/tides/, /data/venice/mose/, /data/venice/vaporetto/, /data/venice/navigation/, /data/venice/closures/ |
| Ligurian Riviera and Portofino | Genoa, Portofino, La Spezia, Cinque Terre, Santa Margherita Ligure | Port directory and facilities; marina contacts and berth information if supplied; sea state, wind, warnings; protected marine-area boundaries and rules; port calls or traffic statistics; ferry schedules; anchorages and restrictions | /data/regions/liguria/ports/, /data/regions/liguria/marinas/, /data/regions/liguria/protected-areas/, /data/regions/liguria/sea-state/ |
| Amalfi Coast and Capri | Capri, Positano, Amalfi, Sorrento, Salerno | Port and landing-point inventory; ferry and hydrofoil routes, schedules, disruptions; sea state and wind; protected-area rules; seasonal traffic; marina services and booking links; access and closure notices | /data/regions/campania/ports/, /data/regions/campania/ferries/, /data/regions/campania/protected-areas/, /data/regions/campania/sea-state/ |
| Sardinia and Costa Smeralda | Porto Cervo, Porto Rotondo, Olbia, La Maddalena, Bonifacio Strait | Port and marina directory; berth dimensions and services if verified; wind, waves, warnings; protected-area boundaries; ferry schedules; port traffic statistics; fuel and service listings with source and update date | /data/regions/sardinia/marinas/, /data/regions/sardinia/sea-state/, /data/regions/sardinia/protected-areas/, /data/regions/sardinia/ports/ |
| Tyrrhenian hubs | Civitavecchia, Naples, Livorno | Port locations and characteristics; passenger and freight statistics; port-call or congestion indicators only if source data supports them; cruise and ferry schedules; port services, fuel, repair directories; marine forecasts | /data/regions/lazio/ports/, /data/regions/campania/ports/, /data/regions/tuscany/ports/, /data/italy/port-traffic/ |
| Adriatic hubs | Trieste, Ancona, Bari, Venice and nearby ports | Port directory; freight and passenger statistics; ferry routes and international connections; marine forecasts; protected-area boundaries; navigation notices | /data/regions/friuli-venezia-giulia/ports/, /data/regions/marche/ports/, /data/regions/apulia/ports/, /data/italy/ferry-routes/ |

**Feasibility note:** "superyacht density," "anchorage wait times," "berth availability," "water-taxi traffic," and "refueling logistics" are attractive products but not guaranteed to exist as open, regularly updated datasets. Treat them as future or partner-fed features until an authorized source is confirmed. EMSA's operational maritime picture is provided only to authorized users, a warning that not all vessel-tracking data is publicly reusable.

## Full Data Catalog to Plan For

1. **Vessel and port activity:** vessel positions and tracks with source, permitted use, timestamp, coverage; vessel type, dimensions, destination, status where the license allows; port-call events; port inventory with coordinates, international codes, managing authority, category; passenger, freight, and cruise traffic by port and year; route density only from documented datasets. Do not promise a live AIS map or "superyacht tracking" until access, licensing, privacy, and security are reviewed.
2. **Marinas and yacht services:** location, contacts, operator, booking method; berth count, max length, draft, shore power, water, waste, security, accessibility if verified; availability only from operator integration; fuel stations with type, hours, last verification; repair yards, chandlers, provisioning, pump-out, emergency services; mooring and anchorage areas with restrictions; prices only when dated and comparable.
3. **Weather, sea state, and water conditions:** wind, gusts, direction, horizon; significant wave height, direction, period; warnings, fog, visibility; tide observations, forecasts, gauges, history; sea temperature, currents, water level; timestamp, model, horizon, resolution, confidence. ISPRA describes the National Mareographic Network, National Ondametric Network, and the Venice Lagoon network.
4. **Navigation, safety, and rules:** protected areas, boundaries, zoning, rules; no-anchor zones, speed limits, restricted waterways; closures, dredging, notices; port entry procedures; rescue contacts; bridge, lock, channel, draft constraints. Every rule page shows the issuing authority, source document, effective date, and last-checked date.
5. **Passenger and local transport:** ferry and hydrofoil routes, stops, schedules, fares, calendars; vaporetto routes and alerts; connections between airports, rail, ports, marinas; alternatives during suspensions. ACTV is the Venice operator source; verify the specific feed is official and supported.
6. **Local discovery and visitor information:** ports, marinas, anchorages, fuel, provisioning, repairs, restaurants, beaches, viewpoints; islands, landmarks, museums, excursions; events, regattas, festivals; accessibility, tender landing, walking distance, hours, booking; curated itineraries. Separate verified facts from editorial and user tips.
7. **Historical and planning data:** monthly and seasonal port traffic; historical tide, wave, weather summaries; marina facility changes; ferry schedule patterns; regulatory changes; aggregated route and demand trends where reuse rights allow. MIT's port dataset lists 351 principal ports; its traffic dataset covers 2014–2017 and must be labeled historical.

## Dataset Page Template

Every dataset page (e.g., /data/regions/liguria/ports/) states: what it covers; what it measures; source; update status; time range; format and access; license and reuse; limitations; related pages.

## SEO and AI-Ready Page System

Country pages (/italy/ports/), region pages (/liguria/ports/), destination pages (/venice/tides/), entity pages (/ports/port-of-genoa/), dataset pages, and API paths (/api/v1/ports/) only for data you have rights and infrastructure to serve. Use stable IDs, coordinates, ISO timestamps, metric units, source citations, and explicit nulls. The SEO differentiator is not hundreds of thin pages but each local page answering a real question with a source-backed map, current conditions where available, and clear freshness.

## Best Launch Order

1. Build the Italy port directory from the MIT port register, with provenance and missing-field notes.
2. Add marine weather and water conditions from ISPRA and national sources, labeling forecasts versus observations.
3. Launch Venice tides and transit using municipal and operator sources, with timestamps and service limitations.
4. Add protected-area pages for Liguria, Campania, and Sardinia using official boundaries and the responsible authority's rules.
5. Partner for commercial data (AIS, berth availability, fuel prices, marina reservations) before advertising those as live.

## Venice Tides Dataset Schema

Canonical dataset page at /data/venice/tides/, live dashboard at /data/venice/tides/live/. The Comune di Venezia reports a tide network of 14 stations, observations updated every 10 minutes, and forecasts of predicted high and low extremes for the next 72 hours. Published open data includes tide level, pressure, wind direction and intensity, air and water temperature, solar radiation, and relative humidity, with station location and latest observation.

Page metadata: publisher Centro Previsioni e Segnalazioni Maree (Comune di Venezia); source https://www.comune.venezia.it/it/content/centro-previsioni-e-segnalazioni-maree; catalog https://dati.venezia.it/ (search term CPSM); open-data landing https://www.comune.venezia.it/it/content/open-data-0; observation frequency PT10M; forecast horizon PT72H (predicted extremes); timezone Europe/Rome; units tide level cm, pressure hPa, wind m/s, temperatures °C, humidity percent. Measurement reference: the Venice conventional tide datum, the Comune's local conventional zero, which must be preserved and never relabeled as a generic sea-level datum. Caveats: confirm current dataset URL, license, formats, and field definitions; source update intervals may differ from display refresh; forecast values are predictions; keep the local datum explicit.

Observation record (one row per station measurement, original timestamp and value intact):

```json
{
  "record_type": "observation",
  "dataset_id": "venice-tides",
  "station_id": "source-station-id",
  "station_name": "Source station name",
  "observed_at": "2026-10-12T12:40:00+02:00",
  "received_at": "2026-10-12T10:42:13Z",
  "latitude": null,
  "longitude": null,
  "tide_level_cm": null,
  "atmospheric_pressure_hpa": null,
  "wind_direction_deg": null,
  "wind_speed_m_s": null,
  "air_temperature_c": null,
  "water_temperature_c": null,
  "solar_radiation": null,
  "relative_humidity_pct": null,
  "source_record_id": null,
  "source_url": null,
  "quality_flag": "unverified",
  "raw_payload_ref": null
}
```

Forecast extreme record (store each forecast high or low as an event rather than fabricating hourly values):

```json
{
  "record_type": "forecast_extreme",
  "dataset_id": "venice-tides",
  "forecast_run_at": "2026-10-12T10:30:00Z",
  "valid_at": "2026-10-12T14:15:00+02:00",
  "event_type": "high_tide",
  "predicted_level_cm": null,
  "location_id": "source-location-id",
  "location_name": "Source forecast location"
}
```

_The source email was cut off inside the forecast record; station metadata and alert records were described but not received._
