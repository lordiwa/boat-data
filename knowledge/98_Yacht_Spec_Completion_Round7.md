# Yacht Spec Completion — Round 7 (Weakest-Tier Band + Lady Beth Carry-Over)

Curated from `research/round7/01_weakest_tier_yacht_specs.md` (lane A) and the
"Addendum: Lady Beth research pass" section of
`research/round7/02_dupe_pairs_loa_carryover.md` (lane B), for TASK-025.
Same format/mechanism as `knowledge/97_Yacht_Spec_Completion_Round6.md` —
`yachtSpecMapper.js`'s `isYachtSpecTable` guard picks up the exact same
`Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed
(kn) | Range (nm) | Flag | Class Society | IMO | Notes` header shape.
Resolves onto EXISTING yacht nodes by exact-then-LOA-disambiguated name only
(never mints).

## Curation notes

**Never-guess discipline applied throughout** (per the ticket): a cell is
only filled with a confirmed value when the source research row gives one
single, unambiguous figure. Where the research file itself flags "sources
vary" for a field, the `[conflict: ...]` marker
(`yachtSpecMapper.js`'s `splitConflictMarker`) is used so the alternate value
lands in `attrs.conflicts`, never silently overwriting the primary. Where the
research file marks a value with a leading `~` (a per-model or otherwise
approximate estimate, not a confirmed hull-specific fact),
`yachtSpecMapper.js`'s `isApproxRaw` routes it to `attrs.conflicts` instead
of a confirmed attr (La Datcha's/Samsara-Oceanco's range, in particular).

**LOA is never written by this mapper** (see `yachtSpecMapper.js`'s own
module header — the LOA column here is used ONLY to disambiguate among
same-named node candidates, never stored). The five confirmed-LOA
corrections (Rivale 56, Arcadia Sherpa 60, Sunseeker Manhattan 65, Navetta
68, Yamas) and the Samsara/Gigia corrections are applied separately via
`graphCleanup.js`'s `YACHT_QUALITY_CORRECTIONS` — see that module's own
TASK-025 comment.

**Same-name disambiguation:** six of this round's targets share their exact
node `name` with an unrelated (or soon-to-be-merged) second graph node —
Dragonfly, Infinity, Lauren L, Luna, Samsara, and Tatiana. Each row's LOA
cell is the real, correctly-attributed hull's own LOA, which the mapper's
existing closest-LOA tie-break resolves unambiguously onto the CORRECT node
in every case except Samsara (both `yacht:samsara` and `yacht:samsara-oceanco`
carry the identical pre-round-7 raw LOA of 88m, a true tie) — see
`graphCleanup.js`'s TASK-025 comment for how the Samsara pair's fields still
land correctly on the survivor regardless of which side the tie-break picks
(the subsequent `samsara -> samsara-oceanco` merge gap-fills either way).
Lady Beth has the same tied-LOA situation (both `yacht:lady-beth` and
`yacht:lady-beth-lurssen` are stored at a rounded `55`), but here the
tie-break's lexicographic fallback happens to land on the correct
`yacht:lady-beth` node directly (shorter id sorts first) — verified, not
assumed.

**Ahpo / Lady Jorgia:** identical real hull (same Lürssen Project Enzo,
renamed May 2023) — both rows carry identical confirmed values per the
research file's own headline finding. The `ahpo -> lady-jorgia` merge
(`graphCleanup.js`'s `YACHT_MERGE_MAP`) runs after this file is ingested;
`yachtSpecMapper.js`'s `FORMER_NAMES_MAP` gains `'lady jorgia': ['Ahpo']` so
the survivor's `former_names` is set directly by this file's own Lady Jorgia
row, independent of merge timing.

**Corpus-confusion quarantine — Nomad, Relentless, Sahana, Mansion Yacht
deliberately have NO row in this table.** Per the research file's own
"UNRESOLVED — no specs applied" verdicts: Nomad's stored 30m LOA and
Relentless's stored 34m LOA both match no real vessel of that name (the only
public "Nomad"/"Relentless" of the right builder are 69.5m/43-44m
respectively — already spec'd on the graph's separate, correctly-attributed
`yacht:nomad-oceanfast` node and left alone here); Sahana's stored
75m/2025/Feadship combination matches no real vessel either. Mansion Yacht
is a per-model product-line spec (Stainless Structures' beach-launchable
line), not a single named, registry-tracked hull — its `~`-prefixed
per-model LOA/beam/draft figures are explicitly NOT hull-specific facts.
All four get a `graphCleanup.js` `QUALITY_FLAGS` `data_quality` note instead
of a spec row — see that module's own TASK-025 comment.

**Sophia / Lady Beth (Lürssen) — no row, `conflicts.identity` note
instead.** `yacht:sophia`'s 108m "Benetti sister-ship" claim traces to a
source-corpus row that does not check out against any independent source
(the real Benetti Giga-Season trio is IJE/LANA/LUMINOSITY, not
Sophia/Mar) — likely fabricated data, distinct from the well-grounded 97m
Feadship `yacht:sophia-feadship`, left split with a
`graphCleanup.js`-applied `conflicts.identity` note (via `YACHT_CONFLICT_NOTES`)
rather than merged or spec'd. `yacht:lady-beth-lurssen` similarly gets a
`conflicts.identity` note recording that no Lürssen-built "Lady Beth" was
found in any source — see the Lady Beth addendum's own "Identity
verification" section.

## Weakest-tier band (research/round7/01_weakest_tier_yacht_specs.md)

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ahpo | Lürssen | 2021 | 115.1 | 18.21 | 4.3 | 5257 | 18 | | Marshall Islands | | 9855276 | Same real vessel as Lady Jorgia below (sold May 2023, renamed) — merge candidate, not applied by this mapper. Range sources vary (6,000nm @ 12kn vs an 8,500nm cruise figure from a different source) — left blank rather than guessed. |
| Atlantis II | Hellenic Shipyards | 1981 | 115.8 | 14.4 | 4.29 | 3243 | | | Bermuda | | 1000667 | Stavros/Philip Niarchos family yacht. |
| Dragonfly | SilverYachts | 2009 | 73.0 | 10.0 | 2.4 | 833 | 27 max / 22 cruise | | | | | Targets the 73m SilverYachts hull (yacht:dragonfly-silveryachts) — distinct from the unrelated 142m Lürssen "Dragonfly" node. No IMO asserted — multiple unrelated vessels share this name publicly. |
| Elements | Yachtley | 2019 | 80.0 | 12.8 | 3.8 | 2950 [conflict: 2443] | 20 max / 17 cruise | 9650 [conflict: 8000] | Malta | | 9589308 | GT/max-speed/range have minor cross-source variance (sources vary 2,443-2,950 GT, 18.4/17.0kn cruise, 8,000nm alt range); primary headline figures stored, alternates routed to conflicts via the `[conflict: ...]` marker. |
| Excellence | Abeking & Rasmussen | 2019 | 79.95 | 14.45 | 3.45 | 2115 | 17 | 5000 | Cayman Islands | | 9823144 | Winch Design exterior/interior. |
| Gigia | Lürssen | 2017 | 85.0 | 14.8 | 3.85 | 2851 | 17 max / 14 cruise | 7500 | Cayman Islands | | 9734252 | Year correction to 2017 (delivered as "Areti"; stored "2005" was a data-entry error, 2024 refit is real) applied separately via `graphCleanup.js`'s `YACHT_QUALITY_CORRECTIONS` — this table's own Year cell cannot override an already-populated value under the mapper's first-non-empty-wins rule. |
| Infinity | Oceanco | 2022 | 117.0 | 16.5 [conflict: 16.1] | 4.7 | 4980 | 18.5 | | Cayman Islands | | 9817896 | Targets the 117m current-build hull (yacht:infinity) — distinct from the unrelated 78m yacht:infinity-oceanco node and from Samsara's 2015 ex-name "Infinity" (88.5m, a different hull entirely). |
| J7 Explorer | PT Bahtera Bahari | 2022 | 120.0 | 21.0 | 4.9 | 8076 | 18 max / 16 cruise | | Indonesia | | | Indonesia's largest domestically-built yacht. No IMO found publicly. |
| La Datcha | Damen Yachting | 2020 | 76.9 | 14.0 [conflict: 16.0] | 3.8 | 2560 | 14.5 max / 12 cruise | ~6000 | Panama | | 9849021 | Range is an estimate ("~6,000") — routed to conflicts, not stored as confirmed. |
| Lady Jorgia | Lürssen | 2021 | 115.1 | 18.21 | 4.3 | 5257 | 18 | | Marshall Islands | | 9855276 | Same real vessel as Ahpo above (renamed May 2023 on sale to Patrick Dovigi) — survivor of the `ahpo -> lady-jorgia` merge (`graphCleanup.js`); `former_names` gains "Ahpo" via `yachtSpecMapper.js`'s `FORMER_NAMES_MAP`. |
| Lauren L | Cassens-Werft | 2002 | 90.0 | 14.24 [conflict: 14.44] | 3.95 | 2942 [conflict: 2991] | 15.5 max / 14 cruise | 3400 | Cayman Islands | | 9246827 | Targets the 90m hull (yacht:lauren-l, ex "Constellation") — distinct from yacht:lauren-l-devonport (95m). GT sources vary 2,942-2,991; low end stored as primary. |
| Liva O | Abeking & Rasmussen | 2023 | 118.2 | 16.8 | 4.0 [conflict: 4.2] | 5054 | 18 | 7100 | Malta | | 9865075 | Abeking & Rasmussen's largest-ever delivery at the time. |
| Luna | Lloyd Werft | 2010 | 115.0 | 20.54 | 5.97 | 5655 | 22.5 | | | | 1010222 | Targets the 115m ex-Abramovich flagship (yacht:luna) — distinct from yacht:luna-2 (90m). |
| Navtilvs | Hellenic Shipyards | 1973 | 115.76 | 14.4 | 4.29 | 3156 | 14 max / 12 cruise | | Malta | Lloyd's Register | | Same build-chain identity as the Niarchos-commissioned original Atlantis (1973) per the naming-chain research; no separate graph node exists for any of its other historical names. |
| Samsara | Oceanco | 2015 | 88.5 | 14.2 | 4.5 | 2914 | 21 max / 14 cruise | ~6700 | Cayman Islands | | 1012177 | Real builder is Oceanco, not Benetti — see the merge in `graphCleanup.js`'s `YACHT_MERGE_MAP` (`samsara -> samsara-oceanco`) plus its own TASK-025 comment for how this row's fields land correctly on the survivor regardless of which same-named node the mapper's tied-LOA fallback picks. Range is an estimate ("~6,700") — routed to conflicts. |
| Tatiana | Bilgin Yachts | 2021 | 80.0 | 12.2 | 3.5 | 1689 | 20 max / 15 cruise | 7500 | Cayman Islands [conflict: reflagged Cook Islands as of 2026] | | 9842918 | Targets yacht:tatiana (tie-break lands correctly since both same-named "Tatiana" nodes share the same 80m LOA) — distinct from yacht:tatiana-bilgin-yachts, left untouched this round. First hull of the Bilgin 263 series. |
| Viva | Feadship | 2021 | 94.0 | 14.0 | 3.9 | 2999 | 20 max / 12 cruise | | Cayman Islands | | 9798246 | Hybrid diesel-electric propulsion. |
| Zen | Feadship | 2021 | 88.38 | 13.5 | 4.1 | 2999 | 17 max / 13 cruise | | Cayman Islands | | 9828053 | Studio De Voogt exterior. |

## Coverage notes

**Confirmed with at least one hull-specific spec (17 rows above, covering 18
of the 23 weakest-tier ids since Ahpo/Lady Jorgia share one real hull):**
Ahpo, Atlantis II, Dragonfly, Elements, Excellence, Gigia, Infinity, J7
Explorer, La Datcha, Lady Jorgia, Lauren L, Liva O, Luna, Navtilvs, Samsara
(Oceanco), Tatiana, Viva, Zen.

**No row — documented `data_quality` note instead (4):** Nomad, Relentless,
Sahana (corpus-confusion quarantine — stored LOA/builder/year combination
matches no real vessel found), Mansion Yacht (per-model spec only, no
individually-named hull). See `graphCleanup.js`'s `QUALITY_FLAGS`.

**No row — `conflicts.identity` note instead (1 of the 23-item weakest-tier
band; a 2nd yacht outside the band, `yacht:lady-beth-lurssen`, gets the
same treatment):** Sophia (108m Benetti claim likely fabricated).

## Lady Beth addendum (research/round7/02_dupe_pairs_loa_carryover.md, "Addendum: Lady Beth research pass")

TASK-024 review residual 4 ("Lady Beth research never actually reached the
graph — only prose, no table row, in either research/round5 or knowledge/97")
closed here with a dedicated research pass's confirmed figures.

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lady Beth | Newcastle Marine | 2011 | 54.86 | 10.36 | 3.05 | 1100 | | 4500 | Cayman Islands | | | Max speed sources vary (15.5kn Boat International / 16kn YachtBuyer) — deliberately left BLANK (not stored as a single confirmed number) rather than picking one; cruise speed 12.0kn agreed across sources but not part of this mapper's schema. `former_names` gains Harbour Island/Sovereign/Loon via `yachtSpecMapper.js`'s `FORMER_NAMES_MAP`. Built_by edge to Newcastle Marine added separately (`graphCleanup.js`, since this mapper never creates builder edges). IMO not found this pass (no fabrication — left blank). |

**`yacht:lady-beth-lurssen` (the second, "Lürssen" graph node for this
name) deliberately has NO row here** — every source found for "Lady Beth"
points to the same single 54.86m Newcastle Marine hull; no Lürssen-built
"Lady Beth" exists in any source searched. Gets a `conflicts.identity` note
instead (`graphCleanup.js`'s `YACHT_CONFLICT_NOTES`).

## Sources

See `research/round7/01_weakest_tier_yacht_specs.md` and
`research/round7/02_dupe_pairs_loa_carryover.md` (including its Lady Beth
addendum) for the full per-yacht citation list (Boat International,
SuperYachtFan, SuperYachtTimes, MarineTraffic, VesselFinder, YachtBuyer,
YachtCharterFleet, Northrop & Johnson, IYC, Wikipedia).
