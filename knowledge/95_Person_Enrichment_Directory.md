# Person Enrichment Directory

Curated from `research/round4/person-enrichment.md` for TASK-021.
Enriches all 110 pre-existing `person` nodes (nationality/industry/role/
status/provenance), via `personMapper.js`'s `isPersonEnrichmentTable`/
`mapPersonEnrichmentTables`.

No Person-cell curation was needed anywhere in this file — the research
pass extracted its own priority list directly from the graph's own
`person` node names (see that doc's own Methodology note), so every one
of the 110 rows below already matches an existing graph node's `name`
field EXACTLY. This mapper resolves onto EXISTING person nodes by exact
name only — it never mints a new person node.

## Curation notes

**Ownership confidence lives on the owned_by EDGE, not the person node**
(per the ticket). `personMapper.js` canonicalizes each row's free-text
Ownership Confidence cell into one of six tiers — `confirmed`, `widely
reported`, `rumored`, `unconfirmed`, `disputed`, `contradicted` — matched
as a case-insensitive substring against the whole cell (checked in an
order that avoids "unconfirmed" being caught by a bare "confirmed"
substring match) — and applies it to every one of that person's EXISTING
`owned_by` edges. Per-yacht nuance within a single cell (e.g. Alexei
Mordashov's "Confirmed (Nord not seized) / Confirmed (Lady M seized)")
is preserved verbatim in the person's own `notes` attr rather than split
apart, since this table is one row per PERSON, not one row per
(person, yacht) pair.

**The ~20 name-variant duplicates and ~15 institutional/placeholder nodes**
this research pass identified (see its own Coverage notes) are handled
entirely by `graphCleanup.js`'s `PERSON_MERGE_MAP` and
`PERSON_NODE_ACTIONS` — not by this mapper or this file. See that
module's own header for the full per-node ledger (every merge pair, every
retype-to-company, every placeholder flag, with its research citation).

**The 4 contradicted/unsupported ownership attributions:**
- **Tatiana -> Bilal Hydrie**: contradicted by public sources naming
  Shapoor Mistry as the real owner. Corrected by `graphCleanup.js`'s
  `fixTatianaOwnership` (re-points the edge to a newly-grounded
  `person:shapoor-mistry` node — a deliberate, narrow exception to
  "never mint a person," justified because this is a factual correction
  with a real, named replacement, not speculative new data).
- **Eike Batista -> H3**: this row's own Ownership Confidence cell already
  reads "**Unconfirmed**" — no special-case code needed; the mapper's
  own canonicalization naturally tags the edge `unconfirmed` once this
  row is ingested.
- **Opera dual claims** (Sheikh Abdullah Al Thani vs. UAE Royal (Abdullah
  bin Zayed)): both rows' Ownership Confidence cells already read
  "**Disputed**" — per the ticket, BOTH edges are kept (not silently
  resolved to one claim), both tagged `disputed` naturally by the
  mapper, no special-case code needed.
- **Project Steel** (coincidental name link to Barry Zekelman's "Man of
  Steel"): verified computationally — no `owned_by` edge from Barry
  Zekelman (or anyone) to `yacht:project-steel` exists in the graph at
  all. Nothing to drop; the research doc's warning is preventive, not
  describing an actual erroneous edge. No action taken.

**7 oligarch orphan persons — edges NOT restored (documented, per the
ticket's own fallback clause):** Alexander Mikheev, Gennady Timchenko,
Sergei Chemezov, Sergei Naumenko, Viktor Medvedchuk, Viktor Vekselberg,
and Suleiman Kerimov are each linked by the corpus (`knowledge/74`) to a
named yacht (Lady Anastasia, Lena, Valerie, Phi, Royal Romance, Tango, and
Amadea respectively) — but **none of those seven yacht names exist as a
node in this graph at all** (verified computationally: no yacht node
named any of the seven, under any case/spelling, exists). Restoring an
`owned_by` edge would require minting a new yacht node, which is out of
scope for a person-enrichment mapper (and against this project's
established "never mint a yacht from an enrichment pass" convention —
see yachtSpecMapper.js). Left undocumented in the graph itself beyond
this note; a genuine follow-up candidate for a future yacht-ingestion
lane if these seven yachts are wanted.

**Sergey Brin (rumored) -> "Dragonfly (Silveryachts)":** a builder-mismatch
data artifact (the real Dragonfly Brin owns is a Lürssen; "Dragonfly
(Silveryachts)" is a different, smaller yacht node). Fixed by
`graphCleanup.js`'s `fixSergeyBrinRumoredArtifact` — the mismatched edge
is dropped before the person-name merge runs (Sergey Brin (rumored) is
otherwise the same real individual as the confirmed `Sergey Brin` node
and merges normally).

**Olympic Yacht Services** (a single builder-shaped row this research
pass also produced, cross-referencing the Lavrion boatyard/marina
complex): deliberately **not applied**. The research's own hedge —
"this should be confirmed against the original corpus source before
being treated as a distinct, separately-founded shipyard" — was not
resolved this round (no further corpus grounding was independently
verified), so `builder:olympic-yacht-services` is left unenriched rather
than acted on with only "most likely corresponds to" confidence. Flagged
here as an open follow-up, not silently dropped.

**Review fix (MEDIUM, post-ship): Sheikh Mansour/Sheikh Mohammed
column-shift.** The ORIGINAL research doc's own rows for "Sheikh
Mansour," "Sheikh Mohammed," and "Sheikh Mohammed bin Rashid Al Maktoum"
put the real Nationality value ("Emirati") one column right, into
Industry, while Nationality itself held the generic
"— duplicate node —" marker meant only for the columns that genuinely
had nothing else to say. Because `personMapper.js` faithfully transcribes
whatever text sits in each column, the shipped result was
`industry: 'Emirati'` and **no `nationality` at all** on the canonical
`person:sheikh-mansour-bin-zayed-al-nahyan` and
`person:sheikh-mohammed-bin-rashid-al-maktoum` nodes (the duplicate rows'
`industry` value survived the graphCleanup.js merge via first-non-empty-
wins, but nothing had ever populated `nationality` on either side).
Fixed by moving "Emirati" back to the Nationality column on all three
affected rows and leaving Industry as `n/a` (neither of these two heads-
of-state-adjacent rows has a distinct industry description anywhere in
the source research beyond what's already captured in their own
Role/Title column).

**Review fix (MEDIUM, post-ship): A+'s owned_by edge had no
ownership_confidence.** Same root cause as above, one level deeper: the
graph's `yacht:a` (A+, ex-Topaz — Sheikh Mansour's *earlier* yacht, before
Blue) owned_by edge is carried by the pre-merge node
`person:uae-mansour-bin-zayed` ("UAE (Mansour bin Zayed)"), not by
"Sheikh Mansour" itself — and that row's own Ownership Confidence cell
was blank ("—"), so `personMapper.js` had nothing to tag that edge with
before graphCleanup.js's `PERSON_MERGE_MAP` carried it, untagged, onto
the canonical node. Fixed by setting "UAE (Mansour bin Zayed)"'s own
Ownership Confidence cell to `Confirmed` (Sheikh Mansour's ownership of
his own earlier yacht is exactly as confirmed as his ownership of Blue) —
`personMapper.js` tags every one of a row's resolved person id's
EXISTING owned_by edges, so this is the row that must carry the
confidence for the A+ edge specifically, not the "Sheikh Mansour" row.

## Persons

| Person | Nationality | Industry | Role/Title | Status | Ownership Confidence | Notes |
|---|---|---|---|---|---|---|
| Abdulla Al Futtaim | UAE (Emirati) | Retail/automotive — Al‑Futtaim Group | Owner, Al‑Futtaim Group | Living | Confirmed | Owns Radiant (ex‑Darius, 110m Lürssen 2009), commissioned by Boris Berezovsky to rival Abramovich's Pelorus. |
| Alexander Mikheev | Russian | Defense/arms export (Rosoboronexport) | CEO, Rosoboronexport | Living (US/EU sanctioned) | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Lady Anastasia (157ft), detained Mallorca Mar 2022; crew member tried to scuttle it in protest. |
| Alexei Mordashov | Russian | Steel (Severstal) | Chairman, Severstal | Living (EU sanctioned) | Confirmed (Nord not seized) / Confirmed (Lady M seized) | Owns Nord (465ft, sailed to Vladivostok pre‑sanctions); previously owned Lady M, seized in Imperia, Italy, Mar 2022. |
| Alisher Usmanov | Russian/Uzbek | Metals/mining/telecom (Metalloinvest, USM) | Founder, USM Holdings | Living (US/EU sanctioned) | Widely reported (beneficial owner) | Dilbar (156m Lürssen, largest by GT) immobilized in Hamburg since Mar 2022; legal title held by sister Gulbahor Ismailova. |
| Alisher Usmanov (legally owned by sister Gulbahor Ismailova) | — duplicate node — | — | — | — | — | Variant of the same person/ownership-structure node above; not a distinct individual. |
| Alisher Usmanov (via sister) | — duplicate node — | — | — | — | — | Same as above. |
| Alisher Usmanov (via sister Gulbahor Ismailova) | — duplicate node — | — | — | — | — | Same as above. |
| Andrey Guryev | Russian | Fertilizer (PhosAgro) | Former Chairman, PhosAgro | Living (US sanctioned) | Confirmed | Alfa Nero (266ft) seized Antigua & Barbuda 2022, sold privately July 2024 for ~$40M after a failed 2023 auction. |
| Andrey Melnichenko | Russian (renounced citizenship) | Fertilizer/coal (EuroChem, SUEK) | Founder | Living (EU sanctioned) | Confirmed (both seized) | Owns "A" (Blohm+Voss, 119m) and Sailing Yacht A (469ft, world's largest sailing yacht); both seized Trieste, Italy, Mar 2022. |
| Ann Walton Kroenke | American | Retail/inherited wealth (Walmart, Walton family) | Heiress; wife of Stan Kroenke | Living | Confirmed | Owns Aquila. |
| Bahrain Royal | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Linked to Al Salamah (139m Lürssen, 1999); no single named owner confirmed. |
| Barry Zekelman | Canadian | Steel/manufacturing (Zekelman Industries) | Executive Chairman | Living | Confirmed | Owns Man of Steel (ex‑Seven Seas, Steven Spielberg's former Oceanco yacht, bought Oct 2021, $150M); has owned multiple yachts all named "Man of Steel" (incl. two Heesens) — likely source of the separate "Z" graph node. |
| Bernard Arnault | French | Luxury goods (LVMH) | Chairman/CEO, LVMH | Living | Confirmed | Owns Symphony (101.5m Feadship). |
| Bilal Hydrie | Pakistani‑Canadian | Petroleum/entrepreneurship (Pennine Petroleum) | Businessman | Living | **Contradicted** | Web search attributes Tatiana (80m Bilgin, 2021) to **Shapoor Mistry** (Indian, Shapoorji Pallonji Group), not Hydrie. Likely a misattribution inherited from the source corpus — flag for correction. |
| Bill Gates | American | Tech (Microsoft co‑founder), philanthropy | Co‑founder, Microsoft; Gates Foundation | Living | Widely reported | Linked to Breakthrough (Feadship) and Wayfinder; also historically linked to leasing Serene from MBS (2014). Purchase/charter details vary by source — treat length/price specifics as unverified color. |
| Bill Gates (support vessel) | — duplicate/placeholder node — | — | — | — | — | Represents the Wayfinder support-vessel relationship, not a distinct person. |
| Dan Snyder (rumored) | American | Media/sports (ex‑Washington Commanders NFL owner) | Former NFL team owner | Living | **Rumored only** (graph itself flags this) | Lady S ownership not corroborated independently this session. |
| David Geffen | American | Entertainment (DreamWorks, Geffen Records) | Media mogul | Living | Confirmed | Sole owner of Rising Sun (453ft Lürssen) since 2010 buyout of co‑owner Larry Ellison. |
| Dmitry Kamenshchik | Russian | Aviation infrastructure (Domodedovo Airport) | Owner/Chairman | Living | Widely reported | Linked to Flying Fox (136m Lürssen); ownership has been described as unclear/disputed in some reporting. |
| Dmitry Pumpyansky | Russian | Steel pipe manufacturing (TMK/Sinara) | Founder | Living (EU sanctioned) | Confirmed | Axioma (240ft) seized by JPMorgan (mortgage rights) in Gibraltar, Mar 2022; sold at auction 2023 for $37.5M. |
| Dubai Royal (Mohammed bin Rashid Al Maktoum) | — duplicate node — | n/a | Ruler of Dubai / UAE PM & VP | Living | Confirmed | Same real person as "Sheikh Mohammed" and "Sheikh Mohammed bin Rashid Al Maktoum" below — three graph nodes, one individual. Owns Dubai (162m). |
| Eduard Khudaynatov | Russian | Oil (ex‑Rosneft president; Independent Petroleum Company) | Businessman | Living (US/EU sanctioned) | Widely reported (disputed) | Claimed owner of Scheherazade (140m Lürssen); ownership publicly contested/litigated, also claimed as owner of Amadea. |
| Egyptian Presidential Yacht | — not an individual — | n/a | Institutional (Egyptian state) | n/a | N/A | El Mahrousa (1865, historic state yacht). |
| Eike Batista (previous) | Brazilian | Mining/oil (EBX Group) | Entrepreneur (convicted, corruption case) | Living | **Unconfirmed** | H3 (105.26m Oceanco) ownership not corroborated — public sources instead cite Qatar's former PM, Vijay Mallya, and the Saudi Royal Family as prior owners. |
| Eike Batista (previously) | — duplicate node — | — | — | — | — | Same as above. |
| Eric Smidt | American | Retail/tools (Harbor Freight Tools) | Chairman/CEO | Living | Confirmed | Owns Infinity (117m Oceanco, ~$300M). |
| Estate of Paul Allen (now Roger Samuelsson) | — ownership-chain node — | n/a | n/a | Paul Allen deceased (2018) | Confirmed | Octopus (126m Lürssen) sold by the Allen estate to Roger Samuelsson (~2022). |
| Faisal Al Ayyar | Kuwaiti | Finance/investment (KIPCO, retired Vice‑Chairman) | Former Vice‑Chairman, KIPCO | Living | **Unconfirmed** | No public source found linking Al Ayyar to a yacht named Elements. |
| Farkhad Akhmedov | Russian/Azerbaijani | Oil & gas (Northgas) | Businessman, former senator | Living | Confirmed | Owns Luna (115m Lloyd Werft, ex‑Abramovich); subject of UK's largest-ever divorce settlement case (Akhmedov v Akhmedova). |
| Frank Fertitta | American | Gaming/casinos (Station Casinos); UFC co‑founder | Chairman, Station Casinos | Living | Confirmed (**former** owner) | Owned Viva (94m Feadship, $175–250M) — **sold to Ken Griffin (Citadel) in August 2024**; graph should be updated to reflect current owner. |
| Gennady Timchenko | Russian | Energy (Novatek, Volga Group) | Businessman | Living (US/EU sanctioned) | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Lena (132ft), seized San Remo, Italy, Mar 2022. |
| Graeme Hart | New Zealander | Manufacturing/packaging (Rank Group, Reynolds Group) | Owner | Living (NZ's richest person) | Confirmed | Owns Multiverse (116m Kleven). |
| Guido Krass | German | Investment (Pari Group); founder, Silver Yachts | Entrepreneur | Living | Confirmed | Owns Bold (85.3m Silver Yachts, delivered 2019, $100M). |
| Herb Chambers | American | Automotive retail (Herb Chambers Companies, 60 dealerships) | Founder | Living | Confirmed | Owns Excellence (80m Abeking & Rasmussen, "Excellence VI" in a long line of same-named yachts). |
| Igor Sechin | Russian | Oil (Rosneft) | CEO, Rosneft | Living (US/EU sanctioned) | Confirmed | Owns Crescent (135.5m, seized Spain Mar 2022); also linked to Amore Vero (seized France) per corpus. |
| Indonesian corporate | — not an individual — | n/a | Corporate/anonymous entity | n/a | N/A | Linked to J7 Explorer (120m). |
| Jack Ma (rumored) | Chinese | Tech/e‑commerce (Alibaba co‑founder) | Retired executive, low public profile since 2020 | Living | **Rumored only** (graph itself flags this) | Zen ownership not corroborated in mainstream press this session. |
| James Packer | Australian | Gaming/media (Crown Resorts, Consolidated Press) | Former Executive Chairman, Crown Resorts | Living | Confirmed | Owns IJE (354ft Benetti, named for his children Indigo/Jackson/Emmanuelle). |
| Jeff Bezos | American | Tech/e‑commerce (Amazon); aerospace (Blue Origin) | Founder/Executive Chairman, Amazon | Living | Confirmed | Owns Koru (127m Oceanco sailing yacht) + support vessel Abeona. |
| Jeff Bezos (rumored) | — duplicate/likely-erroneous node — | — | — | — | Rumored only | Linked in graph to Flying Fox, which is separately (and more credibly) linked to Dmitry Kamenshchik — flag as a probable data conflation. |
| JK Rowling | British | Literature (Harry Potter author) | Author | Living | Widely reported | Linked to Samsara (ex‑Amphitrite); some reporting frames this as part of a billionaire ownership lineage rather than sole personal ownership. |
| John Christodoulou | British‑Cypriot | Real estate (Yianis Group) | Property billionaire | Living | Widely reported | Linked to Zeus; not independently re-verified via fresh web search this session (consistent across corpus/aggregator sources). |
| John Symond | Australian | Finance (Aussie Home Loans, founder) | Founder | Living | Confirmed (**former** owner) | Took delivery of Hasna (73m Feadship) in 2017 for $150M+; **sold ~2020**, yacht renamed Lunasea. |
| Kjell Inge Røkke | Norwegian | Fishing/maritime/industrial (Aker ASA) | Founder/majority owner, Aker | Living | Confirmed | Owns/commissioned REV Ocean (research + expedition megayacht project). |
| Lakshmi Mittal | Indian (UK‑based) | Steel (ArcelorMittal) | Chairman/CEO | Living | Confirmed | Owns Amevi. |
| Larry Ellison | American | Tech (Oracle co‑founder) | Chairman/CTO, Oracle | Living | Confirmed | Owns Musashi (88m Feadship); previously co‑owned Rising Sun with David Geffen until 2010. |
| Laurene Powell Jobs | American | Philanthropy/investment (Emerson Collective); widow of Steve Jobs | Founder/President, Emerson Collective | Living | Confirmed | Owns Venus (Steve Jobs commissioned it; inherited/retained by Powell Jobs after his 2011 death). |
| Laurene Powell Jobs (Steve Jobs family) | — duplicate node — | — | — | — | — | Same as above. |
| Liu Qiangdong | Chinese | E‑commerce (JD.com) | Chairman, JD.com | Living | Widely reported (opaque) | Linked to Golden Odyssey (123.2m); Chinese billionaire yacht ownership is typically not officially confirmed by the individual — treat as press-reported, not self‑disclosed. |
| Liu Qiangdong (JD.com) | — duplicate node — | — | — | — | Widely reported (opaque) | Same person, linked instead to Deep Blue (134.2m, 2025) — same confidence caveat as above. |
| Mark Zuckerberg | American | Tech/social media (Meta/Facebook founder) | Founder/CEO, Meta | Living | Confirmed | Owns Launchpad (118–119m Feadship). Corpus color claiming "no broker, no boat show, direct builder sale" was not independently re-verified this session — treat as plausible but unconfirmed detail. |
| Michael Lee-Chin | Canadian‑Jamaican | Finance/investment (Portland Holdings, AIC Limited) | Chairman/CEO | Living | Confirmed (**former** owner) | Took delivery of Ahpo (115.1m Lürssen, "Project Enzo") in 2021, ~$354M — **sold in 2023 to Patrick Dovigi**, who renamed it Lady Jorgia. Graph currently double-counts this single vessel as two yachts under two owners; both entries are correct as of their respective ownership periods. |
| Mixed (e.g., more Lürssen/Feadship) | — not an individual — | n/a | Aggregate placeholder | n/a | N/A | Represents "Various 110–112m" filler yachts in a top‑50 list; not a real owner. |
| Mohammed bin Salman | Saudi | n/a (head of government) | Crown Prince & Prime Minister, Saudi Arabia | Living | Confirmed | Owns Serene (134m Fincantieri), leased to Bill Gates in 2014 before MBS's purchase. |
| Mohammed bin Zayed Al Nahyan | Emirati | n/a (head of state) | President, United Arab Emirates | Living | Confirmed | Owns Azzam (180m Lürssen, world's longest private yacht). |
| Nancy Walton Laurie | American | Retail/inherited wealth (Walmart, Walton family) | Heiress | Living | Confirmed | Owns Kaos. |
| Nasser Al-Rashid | Saudi | Engineering/royal advisor | Advisor to the Saudi royal family | **Status not independently verified this session** | Widely reported (classic, long-standing case) | Owns Lady Moura (a long-documented, classic superyacht ownership). |
| Oleg Tinkov | Russian (renounced citizenship 2020) | Banking/retail (Tinkoff Bank, founder) | Founder | Living (leukemia diagnosed 2020, in remission since Dec 2020 per reporting) | Confirmed | Owns La Datcha (Damen SeaXplorer, world's first private icebreaker superyacht). |
| Oman Royal (Sultan Haitham) | — duplicate node — | Omani | Sultan of Oman | Living | Confirmed | Same individual as "Sultan Haitham bin Tariq" below — owns Al Said. |
| Oman Royal (Sultan Haitham bin Tariq) | — duplicate node — | Omani | Sultan of Oman | Living | Confirmed | Same individual; owns Fulk Al Salamah. |
| Omani Royal Family | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Also linked to Fulk Al Salamah. |
| Patrick Dovigi | Canadian | Waste management (Green For Life Environmental) | Founder/CEO | Living | Confirmed | Bought Lady Jorgia (ex‑Ahpo) from Michael Lee‑Chin in 2023. |
| Philip Green | British | Retail (Arcadia Group/Topshop) | Former retail tycoon (Arcadia collapsed 2020) | Living | Widely reported | Owns Lionheart. |
| Philip Niarchos | Greek | Shipping (inherited, Niarchos family); art collecting | Heir | Living | Confirmed | Owns Atlantis II (116m, built at family's own Hellenic Shipyard, 1981), one of three sister yachts built for his father Stavros Niarchos. |
| Previously David Geffen (now others) | — ownership-chain placeholder — | n/a | n/a | n/a | Ambiguous | Attached to Pelorus; Geffen's link to Pelorus specifically (vs. his confirmed Rising Sun) was not corroborated — likely a graph placeholder error. |
| Previously Paul Allen (now others) | — ownership-chain placeholder — | n/a | n/a | Paul Allen deceased (2018) | Confirmed | Same Octopus ownership chain as the "Estate of Paul Allen" node above. |
| Qatar Royal | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Linked to Al Mirqab and Katara; corpus separately names former PM Sheikh Hamad bin Jassim bin Jaber Al Thani for Al Mirqab, but that name is not itself a graph node. |
| Qatar (Tamim bin Hamad) | Qatari | n/a (head of state) | Emir of Qatar | Living | Widely reported | Linked to Al Lusail (123m). |
| Rinat Akhmetov | Ukrainian | Metals/mining/energy (System Capital Management) | Founder/Chairman | Living | Widely reported (not self-confirmed) | Linked to Luminance (138.8m Lürssen, delivered 2024); multiple outlets describe him as the "believed" owner rather than a self-disclosed one. |
| Robert Stiller | American | Coffee/retail (Green Mountain Coffee Roasters, founder) | Founder | Living | **Unconfirmed** | No source found tying Stiller to a yacht named Naia; his documented yacht is Grace E (ex‑Andale, 164ft). Likely a graph misattribution. |
| Roger Samuelsson | Swedish | Business/private investment | Businessman | Living | Confirmed | Bought Octopus from the Paul Allen estate (~2022). |
| Roger Samuelsson (ex-Paul Allen estate) | — duplicate node — | — | — | — | — | Same as above. |
| Roman Abramovich | Russian | Metals/oil (ex‑Sibneft, Evraz); former Chelsea FC owner | Businessman | Living (UK/EU sanctioned) | Confirmed | Owns Eclipse (533ft) and Solaris (461ft); both relocated (Turkey/Maldives-area waters) to avoid seizure post‑2022. |
| Samuel Tak Lee | Hong Kong | Real estate (Prudential Enterprises) | Chairman | **Deceased — died 24 May 2026, age 87** | Confirmed | Owned Pelorus (115m Lürssen, acquired 2016, ex‑Abramovich); listed for sale (~€160M asking) as of 2025. Status change should be reflected in the graph. |
| Saudi Royal | — not an individual — | n/a | Generic royal-family placeholder | n/a | N/A | Linked to Alexander, Prince Abdulaziz, and Turama — no single named individual confirmed for these three vessels. |
| Saudi Royal (Mohammed bin Salman) | — duplicate node — | Saudi | Crown Prince & PM | Living | Confirmed | Same as "Mohammed bin Salman" above; owns Serene. |
| Sebastian Kulczyk | Polish | Investment (Kulczyk Investments) | Chairman | Living | Confirmed (**former** owner) | Phoenix 2 (Lürssen, 2010) was built for his late father Jan Kulczyk (d. 2015) and inherited by Sebastian; **sold September 2024**. |
| Sergei Chemezov | Russian | Defense/state industry (Rostec) | CEO, Rostec | Living (US sanctioned) | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Valerie ($153M), seized in Spain, Mar 2022. |
| Sergei Naumenko | Russian | Business (limited public profile) | Businessman | Living (UK sanctioned) | Widely reported (thin sourcing) | No `owned_by` edge in graph (orphan node). Per corpus: owns Phi (192ft), detained in London's Canary Wharf, Mar 2022. **Low confidence this individual meets a "clearly a public figure" bar beyond the sanctions listing** — flag for lighter-touch treatment. |
| Sergey Brin | American | Tech (Google/Alphabet co‑founder) | Co‑founder | Living | Confirmed | Owns Dragonfly (142m, delivered 2024). |
| Sergey Brin (rumored) | — duplicate/likely-erroneous node — | — | — | — | Rumored | Linked in graph to "Dragonfly (Silveryachts)" — inconsistent with Dragonfly's actual builder (Lürssen, not Silveryachts); flag as a probable data artifact. |
| Shahid Khan | American (Pakistani‑born) | Auto parts manufacturing (Flex‑N‑Gate); sports (Jacksonville Jaguars, Fulham FC) | Owner | Living | Confirmed | Owns Kismet (122m Lürssen); available for occasional charter. |
| Sheikh Abdullah Al Thani | Qatari | n/a (royal family, banking background) | Sheikh | Living | **Disputed** | Graph also attributes Opera to "UAE Royal (Abdullah bin Zayed)" — a different person from a different royal family (Al Thani/Qatar vs. Al Nahyan/UAE). This looks like a source conflation; which claim is correct was not resolved this session. |
| Sheikh Mansour | Emirati | n/a | Deputy PM UAE; Chairman, Mubadala; owner, Manchester City FC | Living | Confirmed | Owns Blue (160.6m Lürssen), which replaced his earlier yacht Topaz (now A+ — see the "UAE (Mansour bin Zayed)" row below, which carries that earlier owned_by edge and its own confidence tag). |
| Sheikh Mansour bin Zayed Al Nahyan | — duplicate node — | — | — | — | — | Same individual as above (full name variant). |
| Sheikh Mohammed | Emirati | n/a | Ruler of Dubai / UAE PM & VP | Living | Confirmed | Same individual as "Dubai Royal" and the full-name variant below. |
| Sheikh Mohammed bin Rashid Al Maktoum | Emirati | n/a | Ruler of Dubai / UAE PM & VP | Living | Confirmed | Owns Dubai (162m). |
| Sir Michael Hill | New Zealander | Retail (Michael Hill Jeweller, founder) | Founder | Living | Widely reported | Owns The Beast; not independently re-verified via fresh web search this session. |
| Stephen Orenstein | German‑born, US citizen (Dubai‑based) | Logistics (Supreme Group, military logistics contractor) | Founder | Living | Widely reported | Owns Liva O (118m Abeking & Rasmussen, delivered 2023, ~$250M); one source described the owner only as "a mystery billionaire from Dubai," another names Orenstein directly. |
| Suleiman Kerimov | Russian | Mining/finance (Polyus Gold, Nafta Moskva) | Businessman, Federation Council senator | Living (US sanctioned) | Confirmed | No `owned_by` edge in graph (orphan node). Owns Amadea (348ft), seized in Fiji May 2022 in a high-profile US case; Eduard Khudaynatov has separately claimed ownership. |
| Sultan Haitham bin Tariq | Omani | n/a (head of state) | Sultan of Oman | Living | Confirmed | See Oman Royal duplicates above; owns Al Said and Fulk Al Salamah. |
| Tiger Woods | American | Sports (professional golfer) | Athlete | Living | Confirmed | Owns Privacy (~155ft). |
| Turkish Republic | — not an individual — | n/a | Institutional (Turkish state) | n/a | N/A | Savarona (state/presidential yacht). |
| UAE (Mansour bin Zayed) | — duplicate node — | — | — | — | Confirmed | Same individual as Sheikh Mansour above. This node carries the owned_by edge to A+ (147m Lürssen, ex-Topaz — Sheikh Mansour's earlier yacht before Blue); confidence set here so that edge is tagged before this node merges into the canonical Sheikh Mansour bin Zayed Al Nahyan node. |
| UAE (Mansour bin Zayed Al Nahyan) | — duplicate node — | — | — | — | — | Same individual as Sheikh Mansour above. |
| UAE Royal (Abdullah bin Zayed) | Emirati | n/a (politics) | Deputy PM & Foreign Minister, UAE | Living | **Disputed** | See Sheikh Abdullah Al Thani note above — conflicting Opera attribution. |
| UAE Royal (Hamdan bin Zayed) | Emirati | n/a (politics) | Ruler's Representative, Al Dhafra Region | Living | Widely reported | Owns Yas (converted former Navy frigate). |
| UAE Royal (Mohammed bin Zayed Al Nahyan estate) | — duplicate node, mislabeled — | Emirati | President, UAE | **Living** | Confirmed (Azzam) | MBZ is alive and serving as UAE President — the "estate" framing in this node's name is a graph labeling error; it should not imply he is deceased. |
| UAE (Tahnoun bin Zayed) | Emirati | Politics/business (National Security Advisor; Chairman, ADQ/IHC) | National Security Advisor, UAE | Living | Widely reported | Owns Maryah (125m Elefsis). |
| Unknown (charter-focused) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Loon. |
| Unknown (custom build) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Mansion Yacht. |
| Unknown (disputed) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Alfa Nero (pre‑2024‑sale ownership dispute). |
| Unknown (previously Imperial Yachts) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Lana (managed via Imperial Yachts; beneficial owner undisclosed). |
| Various (ex-John McCaw) | American | Telecom (McCaw Cellular/AT&T Wireless, founder) | Former owner | Living | Widely reported (historical) | Le Grand Bleu (112.8m) was historically linked to John McCaw Jr. as an early owner; since resold to undisclosed parties. |
| Various (residential) | — not an individual — | n/a | Placeholder | n/a | N/A | Linked to Somnio (residential-yacht concept with multiple unit "owners"). |
| Various (residential superyacht) | — duplicate placeholder — | — | — | — | — | Same as above. |
| Viktor Medvedchuk | Ukrainian | Politics/media | Pro‑Russian Ukrainian politician | Living | Widely reported | No `owned_by` edge in graph (orphan node). Per corpus: owns Royal Romance ($200M), seized Rijeka, Croatia, Mar 2022. |
| Viktor Rashnikov | Russian | Steel (Magnitogorsk Iron & Steel Works / MMK) | Chairman | Living (EU sanctioned) | Confirmed | Owns Ocean Victory (140m Fincantieri); relocated to the Maldives to evade seizure. |
| Viktor Vekselberg | Russian | Metals/investment (Renova Group) | Founder | Living (US sanctioned) | Confirmed | No `owned_by` edge in graph (orphan node). Owns Tango (255ft), seized in Mallorca, Spain, Apr 2022. |
| Yiannis Procopiou | Greek | Shipping (presumed) | Unconfirmed | Unknown | **Unconfirmed** | No source found for a "Yiannis Procopiou" or a yacht named "Navtilvs"/"Navtilos." The one well-documented Greek shipping magnate with a similar name is **George Prokopiou** (Dynacom/Sea Traders/Dynagas), who owns a yacht called **Dream**, not Navtilvs. Likely a name/spelling confusion in the source corpus. |

## Sources

See research/round4/person-enrichment.md's own Sources section for the full per-person citation list (Wikipedia, Forbes, Boat International, SuperYachtFan, and knowledge/74/knowledge/13/knowledge/15's in-repo corpus cross-checks).
