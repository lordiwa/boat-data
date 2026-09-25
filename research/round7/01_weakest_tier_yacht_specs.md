# Yacht Spec Completion — Round 7, Lane A (Weakest-Tier "Year+Builder Only" Yachts)

Date: 2026-07-11
Lane: Researcher Lane A
Ticket: TASK-025 (Round 7)

Scope: the 23 graph nodes flagged as `identifiability: identifiable` but
resolvable **only via year + builder** (empty `gt`/`beam`/`draft`/`max_speed`/
`range_nm`/`flag`/`imo`). Format mirrors `knowledge/97_Yacht_Spec_Completion_Round6.md`
(same column set) so the same `yachtSpecMapper.js`-style mechanism can ingest
this file directly — this file resolves onto EXISTING yacht nodes by exact ID
(given in the task), never mints new nodes.

**Never-guess discipline applied throughout:** every filled cell below is
backed by a per-row citation embedded in that row's Notes column. Where
sources conflict, both values are shown with "sources vary." Where a value is
a per-model estimate rather than a confirmed hull-specific fact, it is
prefixed `~` and called out explicitly in Notes. Rows with a genuine
LOA/builder mismatch against the only public record of that name are left
UNRESOLVED (no specs applied to that node) rather than force-fit, per the
same convention Round 6 used for "Barbara Anne," "Grace," etc.

## Headline finding: Ahpo = Lady Jorgia (same real hull)

Graph items **#1 (yacht:ahpo)** and **#10 (yacht:lady-jorgia)** are the SAME
real vessel, not two distinct hulls. The 115.1m Lürssen (Project Enzo,
delivered 2021 to Michael Lee-Chin as **Ahpo**) was sold in May 2023 for a
rumoured €330 million to Canadian billionaire Patrick Dovigi and renamed
**Lady Jorgia**. Confirmed explicitly by YachtCharterFleet's own page title
("AHPO Yacht (ex. Lady Jorgia)") and SuperYachtTimes' sale writeup. Both graph
nodes already carry the identical stored LOA (115.1m), consistent with this
being a rename pair, not a coincidence. Recommend `graphCleanup.js`
`YACHT_MERGE_MAP` treat this as a merge candidate (same pattern as the
Nomad/Amor a Vida/Loon pairs in Round 6) — flagged here for the merge lane,
not merged by this research file.

## Headline finding: Samsara verdict (builder correction, not two hulls)

Graph items **#19 (yacht:samsara, `builderId: builder:benetti`)** and **#20
(yacht:samsara-oceanco, `builderId: builder:oceanco`)** are addressed by the
same real vessel, and the TRUE builder is **Oceanco**, not Benetti:
Oceanco's 88.5m hull was delivered in 2015 as **Infinity** to Eric Smidt
(Harbor Freight Tools founder), sold and renamed **Cloud 9** in 2022 (Brett
Blundy), then sold and renamed **Samsara** in 2023 (current owner J.K.
Rowling) — confirmed by Wikipedia's dedicated "Samsara (yacht)" article,
SuperYachtFan, and YachtCharterFleet's "CLOUD 9 (ex. Infinity)" page. No
Benetti-built "Samsara" exists in any source found. **Verdict: `yacht:samsara`
(Benetti) is a data-quality misattribution — it should be merged onto
`yacht:samsara-oceanco`'s identity with `builderId` corrected to Oceanco,
not treated as a second real hull.** This node's own row below is therefore
recorded as "no separate vessel — see samsara-oceanco," matching Round 6's
convention for confirmed-duplicate non-hulls.

Also note: the graph's item **#7 Infinity (yacht:infinity, Oceanco, 117m,
2022)** is a **completely different, unrelated vessel** from the "Infinity"
that was Samsara's 2015 original name (88.5m). Same name, same builder,
different hulls, different years — do not conflate.

## Spec table

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ahpo | Lürssen | 2021 | 115.1 | 18.21 | 4.3 | 5,257 | 18 | 6,000 @ 12kn (one source cites 8,500nm cruise — sources vary) | Marshall Islands | | 9855276 | Same real vessel as "Lady Jorgia" below — sold May 2023, renamed. Sources: [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/ahpo--97135), [YachtCharterFleet (ex. Lady Jorgia)](https://www.yachtcharterfleet.com/luxury-charter-yacht-54329/ahpo-lurssen.htm), [SuperYachtTimes sale news](https://www.superyachttimes.com/yacht-news/lurssen-yacht-ahpo-sold), [MarineTraffic IMO 9855276](https://www.marinetraffic.com/en/ais/details/ships/shipid:6769934/mmsi:538071653/imo:9855276/vessel:AHPO). |
| Atlantis II | Hellenic Shipyards | 1981 | 115.8 (sources vary 115.76–116) | 14.4 | 4.29 | 3,243 | | | Bermuda | | 1000667 | Stavros/Philip Niarchos family yacht; Caesar Pinnau exterior. Sources: [SuperYachtFan](https://www.superyachtfan.com/yacht/atlantis-ii/), [VesselFinder IMO 1000667](https://www.vesselfinder.com/vessels/details/1000667). |
| Dragonfly | SilverYachts | 2009 | 73.0 (sources vary 73–73.3) | 10.0 | 2.4 | 833 | 27 max / 22 cruise | | | | Not confirmed — IMO lookup is ambiguous; multiple unrelated vessels share the name "Dragonfly" (incl. a 2024-built hull and the 142m ex-Alibaba Lürssen), so no IMO is asserted here to avoid conflating hulls. | Aluminium hull; Espen Øino exterior. Sources: [Yacht Harbour](https://www.ww.yachtharbour.com/yacht/dragonfly-418), [Superyachts.com specs](https://www.superyachts.com/fleet/dragonfly-4539/specs/). |
| Elements | Yachtley | 2019 (one source cites 2018 delivery — sources vary) | 80.0 | 12.8 | 3.8 | 2,950 (sources vary 2,443–2,950) | 20 max / 17 cruise (sources vary 18.4/17.0) | 9,650 @ 13kn (sources vary 8,000 @ 13kn) | Malta | | 9589308 | Alpha Marine exterior, Cristiano Gatto interior. Sources: [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/elements--37703), [MarineTraffic IMO 9589308](https://www.marinetraffic.com/en/ais/details/ships/shipid:5146532/mmsi:248446000/imo:9589308/vessel:ELEMENTS). |
| Excellence | Abeking & Rasmussen | 2019 | 79.95 (graph: 80) | 14.45 | 3.45 | 2,115 | 17 | 5,000 | Cayman Islands | | 9823144 | Winch Design exterior/interior. Sources: [Wikipedia](https://en.wikipedia.org/wiki/Excellence_(yacht)), [Abeking & Rasmussen official](https://www.abeking.com/en/ship/excellence/), [VesselFinder IMO 9823144](https://www.vesselfinder.com/vessels/details/9823144). |
| Gigia | Lürssen | **YEAR CORRECTION: 2017**, not 2005 as stored (refit 2024 confirmed) | 85.0 (sources vary 85–85.3) | 14.8 | 3.85 | 2,851 | 17 max / 14 cruise | 7,500 @ 14kn | Cayman Islands | | 9734252 | Former-names chain: **Areti** (original, delivered 2017 for Igor Makarov) → **Amatasia** (2019 rename) → **Gigia** (2023 rename, current). Winch Design interior/exterior. Sources: [SuperYachtFan](https://www.superyachtfan.com/yacht/gigia/), [MarineTraffic IMO 9734252](https://www.marinetraffic.com/en/ais/details/ships/shipid:6283355/mmsi:319115600/imo:9734252/vessel:GIGIA), [VesselFinder](https://www.vesselfinder.com/vessels/details/9734252). |
| Infinity | Oceanco | 2022 | 117.0 | 16.5 (sources vary 16.1–16.5) | 4.7 | 4,980 | 18.5 | | Cayman Islands | | 9817896 | Espen Øino exterior, Sinot interior. NOT the same vessel as Samsara's 2015 ex-name "Infinity" (88.5m) — different hull, same name, see Samsara rows. Sources: [Wikipedia](https://en.wikipedia.org/wiki/Infinity_(2022_yacht)), [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/infinity--98575). |
| J7 Explorer | PT Bahtera Bahari | 2022 | 120.0 | 21.0 | 4.9 | 8,076 | 18 max / 16 cruise (some listings show 16/12) | | Indonesia | | Not found | Indonesia's largest domestically-built yacht. Sources: [YachtBuyer (beam/draft confirmed via direct fetch)](https://www.yachtbuyer.com/en/fleet/j7-explorer-393-pt-bahtera-bahari), [SuperYachtTimes delivery news](https://www.superyachttimes.com/yacht-news/j7-explorer-yacht-delivered). |
| La Datcha | Damen Yachting | 2020 | 76.9–77.0 | 14.0 (one source cites 16.0 — sources vary) | 3.8 | 2,560 | 14.5 max / 12 cruise | ~6,000 | Panama | | 9849021 | Only Xplorer 75 hull; ice-classed, IMO Polar Code compliant; carries a 3-person submersible. Sources: [MarineTraffic IMO 9849021](https://www.marinetraffic.com/en/ais/details/ships/shipid:6318635/mmsi:352001966/imo:9849021/vessel:LA_DATCHA), [YachtBuyer](https://www.yachtbuyer.com/en-us/fleet/la-datcha-252-damen-yachting). |
| Lady Jorgia | Lürssen | 2021 | 115.1 | 18.21 | 4.3 | 5,257 | 18 | 6,000 @ 12kn (sources vary, see Ahpo row) | Marshall Islands | | 9855276 | **Same real vessel as "Ahpo" above** — see headline finding; current name since May 2023 sale to Patrick Dovigi. Same citations as the Ahpo row. |
| Lauren L | Cassens-Werft | 2002 | 90.0 (one source cites 88.5m — sources vary) | 14.24–14.44 (sources vary) | 3.95 | 2,942–2,991 (sources vary) | 15.5 max / 14 cruise | 3,400 @ 12.5kn | Cayman Islands | | 9246827 | Ex "Constellation." Alpha Marine interior. Sources: [VesselTracker IMO 9246827](https://www.vesseltracker.com/en/Ships/Lauren-L-9246827.html), [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/lauren-l--44549). |
| Liva O | Abeking & Rasmussen | 2023 | 118.2 | 16.8 | 4.0 (one source cites 4.2 — sources vary) | 5,054 | 18 | 7,100 @ 15kn | Malta | | 9865075 | Abeking & Rasmussen's largest-ever delivery at the time; Joseph Dirand exterior/interior. Sources: [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/liva-o--97407), [Abeking & Rasmussen official](https://www.abeking.com/en/ship/livao/). |
| Luna | Lloyd Werft | 2010 | 115.0 (sources vary 114.2–115) | 20.54 | 5.97 | 5,655 | 22.5 | | | | 1010222 | Ex-Roman Abramovich flagship, now reportedly Farkhad Akhmedov's; ice-class expedition hull. Sources: [Wikipedia](https://en.wikipedia.org/wiki/Luna_(yacht)), [SuperYachtFan](https://www.superyachtfan.com/yacht/luna/). |
| Mansion Yacht | Stainless Structures | Custom (no single delivery year) | ~25.6 (84ft) | ~12.19 (40ft) | ~0.91 (3ft) | Not published | | | | | | **Per-model spec, not a confirmed individual hull** — "Mansion Yacht" is Stainless Structures' beach-launchable product line (100% stainless-steel hull, hydraulic beaching legs), not a single named vessel with its own registry record; figures above are the flagship model's published dimensions, marked `~` per the never-guess rule. No GT/max-speed/range/flag/IMO exist for a "model," so left blank rather than guessed. Sources: [Stainless Structures / Mansion Yachts official](https://mansionyachts.com/), [BoatBlurb feature](https://www.boatblurb.com/post/weirdboats-the-mansion-yacht-is-half-aquatic-half-terrestrial-and-a-total-enigma). |
| Navtilvs | Hellenic Shipyards | 1973 | 115.76 (graph: 115.8) | 14.4 | 4.29 | 3,156 | 14 max / 12 cruise | | Malta | Lloyd's Register | Not found | Same build-chain identity as the original Niarchos-commissioned **Atlantis** (1973, Caesar Pinnau exterior) → later renamed **Prince Abdulaziz** → **Al Salamah** → **Issham Al-Baher** (current, Saudi royal family, 2013 refit). "Navtilvs" is the name form used by this specific broker listing (likely a transliteration variant) — treated as the same graph identity per the task's builder+year key, not a separate hull. Source: [YachtBuyer (direct fetch, confirms all fields above plus the naming chain)](https://www.yachtbuyer.com/en-us/fleet/navtilvs-379-hellenic-shipyards). |
| Nomad | Oceanfast | 2003 | **UNRESOLVED — no specs applied** | | | | | | | | | Graph stores LOA 30m for this node, but the ONLY well-documented Oceanfast "Nomad" found anywhere is the 69.5m hull (delivered 2003, refit 2020/2024) — already fully spec'd on the graph's separate `yacht:nomad-oceanfast` node via Round 6. No public 30m Oceanfast "Nomad" exists in any source searched; the 30m figure on this node looks like a data-quality/scrape artifact. Flagged as a same-name/wrong-LOA conflict, NOT force-matched to the 69.5m vessel's specs — leave blank per the never-guess rule. Sources checked: [BOAT International "Nomad" charter feature](https://www.boatinternational.com/charter/luxury-yacht-charter-advice/charter-yacht-of-the-week-70m-oceanfast-nomad), [YachtCharterFleet](https://www.yachtcharterfleet.com/luxury-charter-yacht-23099/nomad.htm). |
| Relentless | Trinity Yachts | 2001 | **UNRESOLVED — no specs applied** | | | | | | | | | Graph stores LOA 34m, but the only public Trinity Yachts "Relentless" is 43.28–44.2m (145ft), refit 2019/2024, Caribbean/Bahamas-based — a ~10m mismatch, same "same-name-different-hull" pattern Round 6 excluded elsewhere (e.g. Barbara Anne, Panam). Real vessel's own specs (beam 8.38m, draft 2m, GT 391, 18 max/15 cruise kn, 5,000nm @ 10kn) are NOT applied to this node given the LOA conflict — recorded here for context only. Sources: [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/relentless--42401), [Yacht Harbour](https://yachtharbour.com/yacht/relentless-2526). |
| Sahana | Feadship | 2025 (expected) | **UNRESOLVED — no specs applied** | | | | | | | | | No public Feadship yacht named "Sahana" (75m, 2025, ~$150M) was found in any source searched. Two candidate vessels exist but neither matches: (a) a 36m **Oceanfast**-built "Sahana" (ex *Eendracht*, 2008, refitted for Australian day-charter, weekly rate US$150,000 — likely the source of the corpus's "$150 million" figure being a mis-scraped weekly rate), and (b) Feadship's genuine 73m **Hasna** (2017, first-ever Feadship for an Australian owner — a same-sounding name that may be the source of the "Feadship" attribution). Neither is a confident match to the graph's stated 75m/2025/Feadship combination — left unresolved rather than guessed. Sources: [YachtCharterFleet — Sahana (Oceanfast, 36m)](https://www.yachtcharterfleet.com/news/refitted-superyacht-sahana-available-for-australia-charters), [Yachting Pages — Hasna delivery (Feadship, 73m, 2017)](https://www.yachting-pages.com/articles/feadship-delivers-superyacht-hasna-to-first-australian-owner.html). |
| Samsara | Benetti | 2015 | — | — | — | — | — | — | — | — | — | **No separate vessel — see the Samsara-Oceanco row below and the headline finding above.** The real "Samsara" is Oceanco-built, not Benetti-built; this node's `builderId: builder:benetti` is a data-quality misattribution and this node is a merge candidate onto `yacht:samsara-oceanco`, not a distinct real hull. No confirmed Benetti "Samsara" exists in any source searched. |
| Samsara (Oceanco) | Oceanco | 2015 | 88.5 | 14.2 | 4.5 | 2,914 | 21 max / 14 cruise | ~6,700 | Cayman Islands | | 1012177 | Former-names chain: **Infinity** (delivered 2015 to Eric Smidt) → **Cloud 9** (2022 rename, Brett Blundy) → **Samsara** (2023 rename, current owner J.K. Rowling). Espen Øino exterior, Sinot/David Kleinberg interior. This is the TRUE identity for both graph "Samsara" nodes — see headline finding. Sources: [Wikipedia "Samsara (yacht)"](https://en.wikipedia.org/wiki/Samsara_(yacht)), [YachtCharterFleet](https://www.yachtcharterfleet.com/luxury-charter-yacht-46833/samsara.htm), [SuperYachtFan](https://www.superyachtfan.com/yacht/samsara/). |
| Tatiana | Bilgin Yachts | 2021 | 80.0 | 12.2 | 3.5 | 1,689 | 20 max / 15 cruise | 7,500 @ 12kn | Cayman Islands (originally; reported reflagged Cook Islands as of 2026) | | 9842918 | First hull of the Bilgin 263 series; largest yacht built in Turkey at delivery. Sources: [VesselFinder IMO 9842918](https://www.vesselfinder.com/vessels/details/9842918), [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/tatiana--84671). |
| Viva | Feadship | 2021 | 94.0 | 14.0 | 3.9 | 2,999 | 20 max / 12 cruise | | Cayman Islands | | 9798246 | **Renamed "Defy"** in a subsequent resale (current name per BOAT International's directory) — record former_names accordingly. Hybrid diesel-electric propulsion; Peter Marino interior. Sources: [BOAT International (listed as "Defy" — ex Viva)](https://www.boatinternational.com/yachts/the-superyacht-directory/defy--93845), [itBoat](https://itboat.com/en/vessels/5214-viva-vKEjr). |
| Zen | Feadship | 2021 | 88.38 (graph: 88) | 13.5 | 4.1 | 2,999 | 17 max / 13 cruise | | Cayman Islands | | 9828053 | Studio De Voogt exterior, Nauta Design/FM interior. Sources: [BOAT International](https://www.boatinternational.com/yachts/the-superyacht-directory/zen--93843), [SuperYachtTimes](https://www.superyachttimes.com/yachts/zen-88m/overview). |

## Coverage notes

**Confirmed with at least one hull-specific spec (18 of 23 node-level
entries, covering 19 of the 23 listed IDs since Ahpo/Lady Jorgia share one
real hull):** Ahpo, Atlantis II, Dragonfly, Elements, Excellence, Gigia,
Infinity, J7 Explorer, La Datcha, Lady Jorgia, Lauren L, Liva O, Luna,
Navtilvs, Samsara (Oceanco), Tatiana, Viva, Zen.

**Per-model estimate only, not hull-specific (1):** Mansion Yacht — no
individually-named, registry-tracked vessel exists; only the product line's
published dimensions were found, marked `~` and left without GT/speed/
range/flag/IMO per the never-guess rule.

**Could NOT be confirmed — left fully unresolved, no specs applied (3):**
- **Nomad** (yacht:nomad, 30m stored) — only a 69.5m Oceanfast "Nomad" is
  publicly documented; the 30m figure doesn't match any real vessel found.
  Searches tried: "Oceanfast yacht 30m 98ft Nomad Fiji tenders charter",
  "Nomad yacht Oceanfast 30m South Pacific charter $10 million specs".
- **Relentless** (34m stored) — only a 43.28–44.2m Trinity Yachts
  "Relentless" is publicly documented, a ~10m mismatch. Searches tried:
  "Relentless yacht Trinity Yachts 2001 34m Caribbean Bahamas charter
  specs", "Relentless Trinity Yachts 34m OR 112ft yacht specs".
- **Sahana** (75m/2025/Feadship stored) — no matching Feadship vessel of
  that name exists; the only public "Sahana" is an unrelated 36m Oceanfast
  charter yacht, and a similarly-named genuine Feadship ("Hasna," 73m,
  2017) is a plausible source of the corpus's builder confusion. Searches
  tried: "Sahana yacht Feadship 2025 75m beam draft GT specs delivery",
  "Sahana superyacht Feadship 2025 Australia $150 million", "Feadship 2025
  delivery Australian owner new superyacht Sahana name".

**Node needing a builder correction, not a spec gap (1):** Samsara
(yacht:samsara, builderId `builder:benetti`) — see headline finding; no
specs were sought for this node as a distinct hull because the underlying
real vessel is Oceanco-built and already covered by `yacht:samsara-oceanco`.

**Year correction found (1):** Gigia — stored as `2005/2024`; confirmed
delivery year is **2017** (as "Areti"), with a genuine 2024 refit. The
`2005` component of the stored year appears to be a data-entry error with
no supporting source found anywhere in this pass.

**Rename/merge candidates surfaced (for the graph-cleanup lane, not applied
here):** Ahpo ⇄ Lady Jorgia (same hull, confirmed rename); Samsara (Benetti)
→ Samsara-Oceanco (misattribution, confirmed same hull); Viva → "Defy"
(current name per BOAT International, worth adding to `former_names`); Gigia
former-names chain Areti → Amatasia → Gigia; Navtilvs's broader naming chain
(Atlantis → Prince Abdulaziz → Al Salamah → Issham Al-Baher) is documented
for context but NOT proposed as a graph merge since none of those other
names exist as separate graph nodes in this batch.
