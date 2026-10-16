# Venice Gondola Dataset

_Sources: five emails from Dave Kess (davidadamkess@gmail.com) dated 2026-10-06 and 2026-10-10, subjects "Venice. Italy: Gondola dataset", "Venice. Italy. The physical boat and its technical identity.", "Venice. Italy: Core material IDs...", "Perplexity. Ai. Ideas. Ai : Sale, rental, valuation, operating costs, and parts." (forwarded from Andres Agama, pcando2529@gmail.com, 2026-10-05), and "Venice gondola dataset you can use as the foundation for datayacht.com's AI-powered Venice section". Perplexity-generated. Intended as the foundation for an AI-powered Venice section combining 2026 operational data, history, technical specifications, pricing, and a record schema._

## Core Entity: Venetian Gondola

| Field | Value |
|---|---|
| Name | Gondola / gondola veneziana |
| First written record | 1094, in a decree by Doge Vitale Falier |
| Type | Flat-bottomed, asymmetric rowing boat |
| Primary use today | Tourism; formerly transport and elite travel |
| Current fleet estimate | About 400–500 gondolas in service |
| Licensed gondoliers | About 400 |
| Passenger capacity | Up to 5 passengers on a standard tourist ride |
| Standard ride | 30 minutes |
| Official fare, day | €90 per boat, 09:00–19:00 |
| Official fare, evening | €110 per boat, after 19:00 |
| Traghetto crossing | €2 per person; gondola-style ferry across the Grand Canal |

Source for the facts above: visit.venice.it (gondola history and gondola rides pages).

## Historical Timeline

- **6th century:** likely ancestor is the Roman cymbula, a crescent-shaped marsh boat depicted in a Ravenna mosaic.
- **1094:** the word gundula first appears in an official Venetian decree.
- **1465–1500s:** the arched, cabin-equipped gondola emerges in paintings and prints; early examples measured roughly 5.5–6 m.
- **1509–1550:** during the War of the League of Cambrai, gondolas were adapted for military use with flatter gunwales and symmetrical ends; an Arsenal manuscript records a 9.73 m war gondola.
- **1550s:** Venice reportedly had more than 8,000 gondolas.
- **1581:** a Venetian writer estimated 9,000–10,000 gondolas for a population of about 100,000, roughly one boat per ten residents.
- **1562–1633:** sumptuary laws restricted decoration, cabins, gilding, painting, carvings, and ornamental irons, contributing to the gondola's black, sober appearance.
- **After 1797:** with the fall of the Republic, gondolas shifted from ceremonial and elite transport toward public transport with a single rower.
- **20th century:** the modern asymmetric hull developed, the left side made longer and wider to balance the standing gondolier and the bow iron.
- **1947:** the oldest gondola still preserved in Venice was built; held at Ca' Rezzonico.
- **2010:** Giorgia Boscolo became Venice's first licensed female gondolier.
- **2020:** standard tourist capacity was reduced from six to five passengers.

## Technical Specifications

| Specification | Modern Gondola |
|---|---|
| Length | About 11 m; one cited modern example is 10.9 m |
| Width | 140–160 cm |
| Hull depth | About 65 cm |
| Draught | About 39 cm; about 52 cm when docked and fully loaded |
| Safe navigation depth | Roughly 60–70 cm of water |
| Bow iron (ferro) weight | Commonly 12–15 kg; builders may fit 6–7 kg to over 20 kg |
| Rowing setup | One gondolier standing at the stern, one oar, a forcola rowlock |
| Rudder | None; the oar both propels and steers |
| Hull shape | Asymmetric: left side longer and wider to counterbalance the rower |
| Construction | Built without formal plans, using a wooden counter-mould called a cantièr |

## Materials and Construction

A gondola is hand-built in a squero, a traditional boatyard. The hull is shaped around three master ribs, each formed from three elements and shaped with an empirical jig called a sèsto.

- Load-bearing side boards (sérci): oak, about 2.2 cm thick, cut from an 11.5 m oak trunk roughly 40 cm across, then bent over a fire of marsh reeds.
- Planking: larch and fir.
- Thwarts and seats: cherry.
- Stem and stern posts: elm, selected with a natural bend so no joint is required.
- Traditional sealing: tarred oakum and hot pitch.
- Modern substitutes: marine plywood, resins, stainless-steel screws.
- Crafts involved: more than 11 trades, including boatbuilders, oar makers (remèr), blacksmiths, gilders, and tailors.

Core material IDs for the schema: material:oak, material:elm, material:larch, material:fir, material:cherry, material:walnut, material:lime, material:mahogany, material:iron, material:marine_paint, material:caulking, material:upholstery.

## Pricing Model for 2026

| Service | Price | Duration | Capacity | Notes |
|---|---|---|---|---|
| Private daytime gondola | €90 per boat | 30 min | Up to 5 passengers | Official city-regulated rate, 09:00–19:00 |
| Private evening gondola | €110 per boat | 30 min | Up to 5 passengers | After 19:00 |
| Cost per person, full boat, day | €18 | 30 min | 5 passengers | €90 divided by five |
| Traghetto crossing | €2 per person | Short crossing | Standing passengers | Gondola-style boat across the Grand Canal |
| Extension | Charged in posted time blocks | Additional time | Same boat | Confirm the posted supplement before boarding |

The official fare is per gondola, not per person: a couple pays €90 for a daytime ride, while five people pay €18 each for the same boat.

## Where to Board and Best Times

Popular official departure areas: San Marco, Rialto, and points along the Grand Canal. For quieter canals, San Tomà and Santa Maria del Giglio are highlighted starting points. Best light is late afternoon; quietest atmosphere after 19:00 when the evening rate applies; quietest canals early morning; avoid midday in summer because the open boat has direct sun exposure. Recommended cultural visit: the Squero di San Trovaso in Dorsoduro, preferably in the morning.

Useful structured place records: stazio (gondola station) with name, sestiere, coordinates, nearby vaporetto stop, route type, crowd level; squero (boatyard) with name, neighborhood, visiting hours, whether construction can be observed; traghetto crossing with route, price, operating pattern, accessibility; landmark route with canal names, bridges passed, palazzi viewed, estimated duration.

## Record Schema (AI-site data model)

DataYacht separates the person and license from the vessel: the gondolier is the closest equivalent to a captain, but only license status and operational links are modeled publicly, never personal identity.

### 1. Vessel: the physical boat and its technical identity

```json
{
  "id": "venice:gondola:000456",
  "type": "gondola",
  "name": "La Serenissima",
  "build_year": 2012,
  "builder_squero_id": "venice:squero:san-trovaso",
  "length_m": 11,
  "beam_cm": 150,
  "hull_depth_cm": 65,
  "draught_cm": 39,
  "loaded_draught_cm": 52,
  "weight_kg": 600,
  "passenger_capacity": 5,
  "propulsion": "single_oar",
  "rudder": false,
  "hull_symmetry": "asymmetric",
  "ferro_weight_kg": 14,
  "construction_parts": 280,
  "wood_species_count": 8,
  "components": []
}
```

### 2. Operator and license

```json
{
  "operator": {
    "gondolier_license": {
      "license_id": "venice:gondolier:license-0000",
      "status": "active",
      "issuing_authority": "Comune di Venezia",
      "theory_hours": 30,
      "practical_hours": 10,
      "training_cost_eur": 800,
      "medical_exam_required": true,
      "swimming_certificate_required": true
    },
    "languages": ["it", "en"],
    "service_area": ["Venice historic centre"]
  }
}
```

License statuses: active, inactive, pending, revoked, unknown. Requirement statuses: required, conditional, not_required, unknown.

### 3. Ownership

```json
{
  "owner_type": "gondolier",
  "owner_entity_id": "venice:person:private",
  "operator_gondolier_id": "venice:gondolier:license-0000",
  "station_id": "venice:stazio:san-marco",
  "ownership_lineage": [
    { "owner_name": "Family example", "period": "1985-2010", "relationship": "family inheritance" }
  ],
  "inheritance_status": "family_inherited"
}
```

### 4. Compliance

```json
{
  "jurisdiction": "IT-Venice",
  "use_type": "commercial_passenger",
  "gondolier_license_required": true,
  "commercial_authorization_required": true,
  "station_assignment_required": true,
  "insurance_required": true,
  "registration_required": null,
  "requirements": [
    { "requirement": "gondolier_license", "status": "required", "authority": "Comune di Venezia", "source_id": "src:comune-venezia" },
    { "requirement": "passenger_liability_insurance", "status": "required", "authority": "Commercial operator policy", "source_id": "src:venice-operator-guidance" }
  ]
}
```

Use types: commercial_passenger, private, collector, rental.

### 5. Insurance (structured coverage records, not a single flag)

```json
{
  "insurance": {
    "policy_status": "active",
    "coverages": [
      { "coverage_type": "passenger_liability", "limit_eur": 1000000, "deductible_eur": 0, "passengers_covered": 5 },
      { "coverage_type": "third_party_liability", "limit_eur": 1000000 },
      { "coverage_type": "hull", "agreed_value_eur": 45000 },
      { "coverage_type": "business_interruption", "daily_indemnity_eur": 300, "waiting_period_days": 3 }
    ]
  }
}
```

Recommended coverage types: passenger_liability, third_party_liability, hull, operator_liability, weather_lagoon_damage, theft_vandalism, business_interruption, employer_liability.

### 6. Lifecycle

```json
{
  "build_year": 2012,
  "condition": "good",
  "expected_first_service_life_years": 15,
  "post_restoration_service_life_years": 10,
  "maintenance_events": [
    { "date": "2026-03-01", "type": "annual_maintenance", "cost": { "amount": 3000, "currency": "EUR", "basis": "one_time" }, "work": ["paint", "caulking", "oiling"] }
  ],
  "restoration_events": [],
  "retrofits": [],
  "projected_next_major_restoration_year": 2027
}
```

Condition values: new, excellent, good, fair, project, retired. Restoration scopes: cosmetic, structural, major, full_rebuild.

Lifecycle rules: if vessel_age >= 15 and no major restoration, recommend a restoration assessment; if vessel_age >= 25 and last_restoration_year <= build_year + 15, flag "approaching_end_of_extended_service_life"; if a retrofit category is propulsion, flag "may_change_registration_and_insurance_classification".

### 7. Retrofit records

```json
{
  "retrofits": [
    { "category": "safety", "description": "Non-slip decking and improved boarding handholds", "date": "2025-04-10", "regulatory_impact": "low", "venice_compatible": true },
    { "category": "propulsion", "description": "Electric auxiliary motor", "regulatory_impact": "high", "venice_compatible": false }
  ]
}
```

Retrofit categories: safety, accessibility, comfort, electrical, propulsion, materials, preservation. Regulatory impact: none, low, medium, high.

### 8. Market: sale, rental, valuation, operating costs, and parts

```json
{
  "listing_status": "for_sale",
  "asking_price": { "amount": 28000, "currency": "EUR", "basis": "one_time" },
  "estimated_value": { "amount": 30000, "currency": "EUR", "basis": "one_time" },
  "rental_rate": { "amount": 450, "currency": "EUR", "basis": "per_day" },
  "operating_costs": {
    "annual_maintenance_eur": 3000,
    "insurance_annual_eur": 2500,
    "mooring_annual_eur": 3000,
    "license_fees_annual_eur": 500
  },
  "parts": [
    { "id": "part:forcola", "name": "Forcola", "italian_term": "forcola", "material_ids": ["material:walnut"], "availability": "made_to_order", "craftsperson_role": "remer" }
  ]
}
```

Listing statuses: not_for_sale, for_sale, sold, auction, rental. Part availability: made_to_order, in_stock, discontinued, unknown.

### 9. Experience and official pricing

```json
{
  "experience": {
    "official_tariff": [
      { "amount": 90, "currency": "EUR", "basis": "per_boat", "duration_minutes": 30, "time_window": "09:00-19:00", "valid_from": "2026-01-01", "official": true, "source_id": "src:comune-venezia" },
      { "amount": 110, "currency": "EUR", "basis": "per_boat", "duration_minutes": 35, "time_window": "from 19:00", "valid_from": "2026-01-01", "official": true, "source_id": "src:comune-venezia" }
    ],
    "routes": ["venice:route:grand-canal-classic", "venice:route:quiet-back-canals"],
    "departure_locations": ["venice:location:san-marco", "venice:location:rialto", "venice:location:san-toma"]
  }
}
```

### 10. Sources

```json
{
  "sources": [
    { "id": "src:comune-venezia", "publisher": "Comune di Venezia", "url": "https://www.comune.venezia.it/it/content/servizio-gondola", "title": "Tariffe, orari e stazi Servizio Gondola", "published_at": "2023-04-20", "retrieved_at": "2026-10-05", "reliability": "official" }
  ]
}
```

Source reliability levels: official, primary, secondary, user_generated.

### Validation rules

- A gondola must have at least one source.
- A price must state currency, basis, and validity start date.
- A commercial Venice gondola must record gondolier-license, insurance, and station-assignment requirements.
- A propulsion retrofit must carry a regulatory-impact rating.
- A restoration event must state its scope.
- A part must state availability.
- Personal gondolier identity must not be required; only license status and operational links are modeled publicly.
