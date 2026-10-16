# Florida Corridor Marine Facility Dataset Schema (Palm Beach to Miami, Miami to Key West)

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-10-12, subject "a production-ready schema for /data/florida/corridors/palm-beach-to-miami/marinas/. and /data/florida/corridors/miami-to-key-west/marine-facilities". Perplexity-generated schema. The email was truncated inside the claim record._

The schema treats a corridor as an ordered directory of marine facilities, not as a claim that every facility lies directly on one navigable route, and keeps marina facts separate from navigation, pricing, availability, and source evidence.

**Seed source.** The FWC marina layer (gis.myfwc.com, Open_Data/Marinas_Florida) has fields for address, city, county, coordinates, wet and transient slips, dry racks, moorings, fuel, repairs, pump-out, waterway, route information, and last-edited date. FWC explicitly cautions that its inventory may be incomplete or inaccurate, so use it as a seed and verify records against operators and local sources.

## Dataset Page Schema

- **url:** /data/florida/corridors/palm-beach-to-miami/marinas/
- **title:** Palm Beach to Miami Marinas: Facilities and Services
- **page_type:** regional_dataset
- **description:** a source-linked directory of marinas, boatyards, dry-storage facilities, mooring fields, and public docks in the Palm Beach-to-Miami corridor
- **geography:** id florida-corridor-palm-beach-to-miami; state Florida; counties Palm Beach, Broward, Miami-Dade; north_to_south_order true
- **corridor_definition:** type editorial_geographic_corridor; route_claim false; inclusion does not prove direct navigable access from the Intracoastal Waterway or suitability for a particular vessel
- **cities_ordered:** Jupiter, Tequesta, Juno Beach, North Palm Beach, Palm Beach Gardens, Lake Park, Riviera Beach, West Palm Beach, Palm Beach, Lake Worth Beach, Lantana, Boynton Beach, Delray Beach, Boca Raton, Highland Beach, Deerfield Beach, Lighthouse Point, Pompano Beach, Fort Lauderdale, Lauderdale-by-the-Sea, Dania Beach, Hollywood, Hallandale Beach, Sunny Isles Beach, North Miami, North Miami Beach, Miami, Miami Beach, Key Biscayne, Coconut Grove, Coral Gables, Cutler Bay, Homestead
- **dataset:** id florida-palm-beach-to-miami-marine-facilities; version 1.0.0; publisher Datayacht (role aggregation_and_verification)
- **source_datasets:** fwc-marinas-florida (seed_inventory; completeness and accuracy not guaranteed); palm-beach-marine-industry-directory from the Marine Industries Association of Palm Beach County (discovery_and_cross_check; includes businesses beyond marina facilities); miami-dade-marinas from Miami-Dade County (official_public_facility_cross_check)
- **record_types:** marina, boatyard, dry_storage, mooring_field, public_dock, yacht_club, municipal_marine_facility, private_dock_facility
- **update_policy:** source refresh varies by source; operator verification every 365 days; urgent status refresh event-driven
- **license:** verify per source
- **output_formats:** JSON, CSV, GeoJSON
- **caveats:** the index is only as complete as its source coverage and verification; unknown capacity is not zero capacity; availability and pricing require current operator confirmation; inclusion does not imply public access or navigable access for a given vessel

## Facility Record

A canonical record for identity and location. Changing or multi-valued information (prices, availability, services, source claims) lives in linked records.

```json
{
  "record_type": "facility",
  "facility_id": "dy:fl:facility:stable-id",
  "canonical_name": "Operator's current public name",
  "aliases": [],
  "former_names": [],
  "facility_types": ["marina"],
  "operating_status": "unknown",
  "access_class": "unknown",
  "corridor_id": "florida-corridor-palm-beach-to-miami",
  "corridor_order": null,
  "location": {
    "street_address": null, "city": null, "county": null, "state": "FL", "postal_code": null, "country": "US",
    "latitude": null, "longitude": null, "coordinate_source_id": null, "coordinate_accuracy_m": null,
    "waterbody_name": null, "waterway_name": null, "side_of_waterway": null, "waterway_mile": null
  },
  "operator": { "operator_id": null, "operator_name": null, "parent_company": null, "official_url": null },
  "contacts": { "main_phone": null, "dockmaster_phone": null, "email": null, "emergency_phone": null, "booking_url": null },
  "source_status": "pending_verification",
  "last_verified_at": null,
  "created_at": null,
  "updated_at": null
}
```

access_class uses controlled values: public, private, members_only, customers_only, government_restricted, unknown. This avoids implying that a facility listed in a directory accepts transient visitors.

## Capacity and Vessel Fit

Every capacity field is nullable and carries evidence. FWC supplies baseline fields (wet slips, transient slips, dry racks, ground slips, moorings) but dimensions and availability need operator confirmation.

```json
{
  "record_type": "facility_capacity",
  "facility_id": "dy:fl:facility:stable-id",
  "capacity_id": "dy:capacity:stable-id",
  "capacity_type": "wet_slips",
  "quantity": null,
  "quantity_unit": "slips",
  "capacity_scope": "total",
  "vessel_fit": { "max_loa_ft": null, "max_beam_ft": null, "max_draft_ft": null, "max_air_draft_ft": null, "max_displacement_lb": null, "minimum_loa_ft": null, "max_vessel_type": null },
  "water_depth_ft": null,
  "controlling_depth_ft": null,
  "measurement_datum": null,
  "status": "unknown",
  "source_claim_ids": [],
  "valid_from": null,
  "valid_until": null,
  "last_verified_at": null
}
```

capacity_type values: wet_slips, transient_slips, annual_slips, mooring_balls, dry_racks_indoor, dry_racks_covered, dry_racks_outdoor, ground_storage, trailer_storage, haul_out_slots, boatyard_storage, public_dockage.

## Services and Policies

```json
{
  "record_type": "facility_service",
  "facility_id": "dy:fl:facility:stable-id",
  "service_id": "dy:service:stable-id",
  "service_type": "fuel_diesel",
  "availability": "unknown",
  "details": { "fuel_grade": null, "fuel_dock": null, "hours": null, "public_access": null, "reservation_required": null, "payment_methods": [] },
  "source_claim_ids": [],
  "last_verified_at": null
}
```

service_type values: fuel_gasoline, fuel_diesel, fuel_non_ethanol, pumpout, boat_ramp, haul_out, travel_lift, crane, dry_stack, boat_repair, engine_repair, hull_repair, bottom_paint, marine_electronics, chandlery, provisioning, water, shore_power, showers, laundry, restrooms, parking, trailer_parking, security, wifi, transient_dockage, dinghy_dock.

Policies are kept separate: liveaboard rules, pets, access hours, contractor rules, reservation and cancellation, maximum stay, trailer parking, overnight parking, membership requirements.

## Pricing and Availability

Never treat a directory's old rate as current pricing, or an operator's "transient dockage available" statement as real-time berth availability. Miami-Dade publishes marina rate schedules specific to its facilities and effective dates; store the schedule and date, not a corridor-wide inferred price.

```json
{
  "record_type": "facility_price",
  "facility_id": "dy:fl:facility:stable-id",
  "price_id": "dy:price:stable-id",
  "product": "transient_wet_slip",
  "rate_amount": null,
  "currency": "USD",
  "rate_unit": "per_foot_per_day",
  "minimum_charge": null,
  "tax_included": null,
  "utilities_included": null,
  "effective_from": null,
  "effective_until": null,
  "price_source_type": "operator_published",
  "source_claim_ids": [],
  "last_verified_at": null
}
```

```json
{
  "record_type": "facility_availability",
  "facility_id": "dy:fl:facility:stable-id",
  "capacity_type": "transient_slips",
  "availability_status": "not_provided",
  "available_quantity": null,
  "checked_at": null,
  "valid_for": null,
  "booking_url": null,
  "phone_to_confirm": null,
  "source_claim_ids": []
}
```

Allowed availability statuses: available, limited, waitlist, unavailable, not_provided, stale, unknown. Only show real-time availability when the operator or booking system supplies a current feed.

## Corridor and Route Relationships

The marina corridor is a geographic index. Navigation is a separate dataset with charted routes and obstacles; do not derive a route from the order of cities.

```json
{
  "record_type": "facility_corridor_membership",
  "facility_id": "dy:fl:facility:stable-id",
  "corridor_id": "florida-corridor-palm-beach-to-miami",
  "sort_order": 17,
  "membership_basis": "city_or_county_geography",
  "navigable_access_verified": false,
  "waterway_connection_id": null,
  "notes": null
}
```

For navigation, link separate source records for: Intracoastal Waterway segment and chart reference; inlet or harbor access; bridge type, clearance, opening schedule, controlling source and date; channel depth and chart datum; navigation notices, dredging, restrictions, closures; vessel-specific fit using draft and air draft. NOAA's Coast Pilot documents bridge clearances, but operational decisions need current official charts and notices; do not hard-code a single corridor-wide clearance.

## Evidence and Verification

Every important value has a source claim. A claim can be operator-published, government-published, observed, or calculated, and the page says which.

```json
{
  "record_type": "claim",
  "claim_id": "dy:claim:facility-id:wet-slips",
  "subject_id": "dy:fl:facility:stable-id",
  "predicate": "wet_slips_total",
  "value": 0,
  "unit": "slips",
  "claim_status": "unknown",
  "source_id": null,
  "source_url": null
}
```

_The source email was cut off inside the claim record. The Miami-to-Key-West marine-facilities corridor named in the subject uses the same schema with its own corridor id and ordered city list._
