# MarineTraffic — AIS Ship-Tracking Platform Profile

_Source: email from Dave Kess (davidadamkess@gmail.com), 2026-10-15, subject "Feed. & data scrape. With. Ai. Tokens: https://www.marinetraffic.com/". Grok-generated profile, sent as a candidate feed or scrape source for DataYacht._

| Platform | Description | Key Features | Focus Areas |
|---|---|---|---|
| MarineTraffic | Leading global ship-tracking and maritime intelligence platform delivering near real-time vessel positions and related data worldwide. Launched 2007 as an academic AIS project by Professor Dimitris Lekkas (University of the Aegean, Ermoupoli, Greece); commercialized from 2012 with Dimitris Memos and Argyris Stasinakis; headquartered in Athens with later London presence; acquired by Belgian data firm Kpler in early 2023 together with FleetMon and now operated as a Kpler subsidiary. | Live global vessel map; vessel details (identity, dimensions, tonnage, build, photos, tracks); port arrivals, departures, berth calls, congestion; voyage history and predicted ETAs; ownership and operator data; event detection (ship-to-ship transfers, bunkering, deviations); historical archives, density maps, weather layers; APIs, NMEA streams, enterprise tools; user-contributed photos | Ship tracking; maritime intelligence for shipping, logistics, commodity trading, security, compliance; enthusiast tracking; AIS data aggregation |

## Why It Was Founded

MarineTraffic started as an academic project to study marine telecommunications, vessel-movement simulation (navigation safety and incident response), interactive information systems, real-time databases, port-traffic statistics, and environmental applications. The core goal became making maritime information universally accessible and transparent, serving both enthusiasts and professionals, with open access for basic use and paid advanced features.

## How It Works

The foundation is the Automatic Identification System (AIS), a mandatory VHF radio system under IMO SOLAS rules (since about 2004) on most commercial vessels of 300 GT and above on international voyages, cargo ships of 500 GT and above, and all passenger ships. Ships broadcast:

- **Dynamic data:** position (GPS), speed, course, heading, rate of turn, navigational status.
- **Static data:** name, IMO number, MMSI, call sign, dimensions, vessel type.
- **Voyage data:** destination, ETA, draught.

MarineTraffic collects this via a large community network of terrestrial coastal AIS receivers (originally volunteer-operated, many using equipment MarineTraffic provides; strong near coasts and ports, roughly 40 nautical mile range; recent Kpler figures cite 9,000 to 13,000+ stations across terrestrial, satellite, and roaming), satellite AIS for open-ocean coverage, and roaming AIS receivers on vessels for denser data on busy trade lanes. Data flows to a central database in near real time, is decoded from NMEA sentences, stored with archives back to about 2009–2010, enriched with port geography, vessel particulars, and photos, and displayed on the live map and through APIs. Free users get basic near-real-time coastal tracking; paid plans unlock satellite coverage, longer history, fleet tools, analytics, weather overlays, ETAs, port congestion insights, and ownership data.

## Scale

Millions of monthly unique users; hundreds of millions to over a billion AIS messages processed daily under the broader Kpler network.

## Relevance to DataYacht

A candidate source for vessel activity and port-call data. Per the Italy and Florida architecture briefs (files 108 and 109), vessel positions must only be used from a lawful, licensed feed with permitted use, timestamp, and coverage disclosed; do not infer live positions or congestion from stale or incomplete data.
