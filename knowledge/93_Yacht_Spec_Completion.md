# Yacht Spec Completion

Curated from `research/round3/yacht-specs.md` for TASK-020, and extended
in TASK-021 with `research/round4/person-enrichment.md`'s "Suspect
yachts" table (9 rows the Round 4 person-enrichment pass independently
grounded/resolved — see the "TASK-021: suspect-yacht resolutions" section
below). Closes the beam/draft/GT/max-speed/range/flag/class-society/IMO
gap for the graph's largest, best-documented yachts, via
`yachtSpecMapper.js`'s `isYachtSpecTable`/`mapYachtSpecTables`.

Unlike every other enrichment mapper in this project, this mapper
**never** mints a new yacht node — it resolves onto EXISTING yacht nodes
by exact-then-normalized name only; a row with no matching yacht node is
counted as unresolved and reported, never created (see this file's own
Curation notes for the one such row, *Amadea*, deliberately left
uncurated).

## Curation notes

**5 rows excluded entirely (zero researched spec data, pure QA flags):**
*MOSAIQUE*, *Blue*, *EIV*, *Fulk Al Salamah*, *Evrima* — the source doc's
own rows for these carry no beam/draft/GT/etc data at all, only a Notes
cell explaining why the pass returned nothing confident. Including an
all-empty row would be a no-op for the mapper anyway; omitting them here
keeps this file's own table meaningfully "what was actually researched."
*MOSAIQUE* (and, separately, *RIO* — not in this research doc's own
table at all, since it returned zero results even as a Notes-only row —
see the source doc's Coverage notes) are handled instead by
`graphCleanup.js`'s `QUALITY_FLAGS` map (a `data_quality` attr, not a
delete — see that module's own header). *Fulk Al Salamah*, *Blue*, *EIV*
remain open follow-up items for a future research pass, per the source
doc's own recommendation.

**5 Yacht cells curated to resolve unambiguously onto ONE existing node**
(the source doc's own parenthetical LOA annotations / slash-combined
rename pairs would otherwise either fail to exact-match at all, or
resolve ambiguously):

| Research cell (original) | Curated to | Why |
|---|---|---|
| Kismet (122 m) | Kismet | Strips the parenthetical so it exact-matches the graph's "Kismet" node; LOA=122 in this row also lets the mapper's own LOA-disambiguation correctly prefer the 122m node over the (separately-merged-away) 95m one even without this curation, but curating the name is cleaner and matches the doc's own emphasis on this exact trap. |
| Jubilee / Kaos | Kaos | The graph carries BOTH "Jubilee" and "Kaos" as separate nodes for the same hull (rename chain Jubilee → Secret III → Kaos) — curated to the CURRENT name, which is also the canonical side of `graphCleanup.js`'s `YACHT_MERGE_MAP` entry `jubilee -> kaos`. |
| Lana / Mar | Mar | Same pattern: Lana → Mar rename, curated to the current name, canonical side of the `lana -> mar` merge. |
| Madsummer / CC-Summer | Madsummer | Same pattern: CC-Summer → Madsummer rename, curated to the current name, canonical side of the `cc-summer -> madsummer` merge. |
| Kismet (95.2 m) | Whisper | This is the OLD "Kismet" identity (Shahid Khan's original 95m yacht, sold to Eric Schmidt in 2023 and renamed) — curated directly to "Whisper" (the graph's own, separately-existing node for the renamed identity) rather than "Kismet" a second time, since after `graphCleanup.js`'s `kismet-lurssen -> whisper` merge only "Whisper" survives. Curating the cell this way means the spec data lands on the right node immediately, with no dependency on merge-then-mapper ordering. |

**2 cells curated into an explicit `[conflict: ...]` marker** (per the
ticket: "follow the yacht mapper's existing conflicts convention rather
than picking silently" — `yachtSpecMapper.js`'s `splitConflictMarker`
parses this exact format into a primary value plus one or more
`attrs.conflicts` entries):

- **Al Lusail**'s Beam cell: "20 (Boat International) / 23 (Wikipedia)"
  → **"20 \[conflict: 23\]"**. Primary value (Boat International, 20m) is
  stored as `attrs.beam`; "23" is recorded in `attrs.conflicts.beam`
  rather than silently dropped or silently overwriting.
- **Yersin**'s Flag cell: "Oman (one source) / Malta (another) —
  unresolved" → **"Oman \[conflict: Malta\]"**. Same treatment for
  `attrs.flag`/`attrs.conflicts.flag`.

**1 row deliberately left unresolvable:** *Amadea* (106.1m, Lürssen,
2017) has no corresponding yacht node in this graph at all (confirmed
computationally — no node named "Amadea" exists) — left as researched;
the mapper will count it as `unresolved` and report the name, never
mint a new node for it (per the ticket).

**Not otherwise touched:** every row's LOA cell is left exactly as
researched (including messy ones like *Renaissance*'s "111.85 (source)
vs 111.6 (graph)" and *Yersin*'s "76.6 (graph: 78)") — `yachtSpecMapper.js`
never stores or parses the LOA column itself; it is read ONLY as a
disambiguation signal when 2+ yacht nodes share an exact name (see that
module's own `resolveYachtId`). Several other yachts researched here
(Prince Abdulaziz, Sophia) have known graph-side duplicate-node issues
noted in their own Notes cells; Prince Abdulaziz's duplicate is merged by
`graphCleanup.js`'s `YACHT_MERGE_MAP` (a "confirmed 2 duplicate nodes"
case per the source doc), while Sophia's is a "likely" (not confirmed)
mis-scale and is deliberately left unmerged this round, consistent with
this project's practice of only merging GROUNDED duplicates.

**Former names (7 confirmed renames)** are populated by a small,
hand-grounded map in `yachtSpecMapper.js` itself (`FORMER_NAMES_MAP`),
not a table column — see that module's own header for the full mapping
(A+←Topaz, Kaos←Jubilee+Secret III, Mar←Lana, Madsummer←CC-Summer,
Zeus←Eco, Multiverse←Ulysses, Whisper←Kismet).

## Yachts ≥150 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Somnio | VARD (Fincantieri group) | — | 222 | 27 |  | 33,500 |  |  |  |  |  | Not yet delivered as of research date; largest private/residence yacht announced. Not a Feadship (common mislabel). |
| REV Ocean | Vard/Fincantieri | 2019 (launch); delivery pending | 194.9 | 22 | 5.25 | 19,235 | 17 max / 11 cruise | 21,120 | Norway | Polar Class 6 | 9840037 | Research/expedition vessel, not a private yacht in the strict sense. |
| Azzam | Lürssen | 2013 | 180 | 20.8 | 4.3 | 13,136 | 32+ |  | Abu Dhabi, UAE |  | 9693367 | World's longest private motor yacht. |
| Scenic Eclipse | Uljanik | 2019 | 166.1 | 21.5 |  | 17,545 | 19.5 max / 17 service |  | Bahamas (ex-Malta) |  | 9797371 | Expedition cruise ship, borderline "yacht" classification. |
| Golden Horizon | Brodosplit | 2017/2021 | 162.22 | 18.5 |  | 8,770 | 20 max / 16 cruise |  | Croatia |  | 9793545 | 5-masted tall ship, largest sailing vessel by GT. |
| Eclipse | Blohm+Voss | 2010 | 162.5 | 22.0 | 5.9 | 13,000 | 22 |  | Bermuda |  | 1009613 | Roman Abramovich. |
| Dubai | Blohm+Voss/Lürssen | 2006 | 162 | 22 | 5 | 13,470 | 26 | 8,500 | Dubai, UAE |  | 1006324 | Ruler of Dubai. |
| Al Said | Lürssen | 2008 | 155 | 24.0 | 5.2 | 15,850 | 25.2 max / 14.5 cruise |  | Oman |  | 9463774 | Sultan of Oman's yacht. |
| Dilbar | Lürssen | 2016 | 156 | 23.5 | 6.0 | 15,917 | 22.5 max / 18 cruise |  | Cayman Islands |  | 9661792 | Built as "Project Omar"; seized by Germany 2022 (Usmanov sanctions). |
| Opera | Lürssen | 2023 | 146.35 | 21.5 | 6.0 | 12,518 |  |  | Cayman Islands |  | 1012933 | Reported owner Sheikh Abdullah bin Zayed Al Nahyan. |
| El Mahrousa | Samuda Brothers | 1865 (lengthened 1872, 1905) | 146 | 13 | 5.3 | 4,561 | 16 max / 13 cruise |  | Egypt |  |  | Oldest active superyacht in the world; Egyptian state yacht. |
| Prince Abdulaziz | Helsingør Værft | 1984 | 147 | 18.3 | 4.9 | 8,233 |  |  |  |  |  | Saudi royal yacht; designed by Maierform. Graph has 2 duplicate nodes for this yacht. |
| A+ | Lürssen | 2012 | 147 |  |  |  |  |  |  |  |  | **Rename:** formerly *Topaz*. Beam/draft/GT/IMO not confirmed this pass. |

## Yachts 120-149 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sailing Yacht A | Nobiskrug | 2017 | 144.03 | 24.80 | 8.00 | 12,558 | 21 | 5,340 | Sierra Leone (ex-Bermuda, ex-Isle of Man) | Lloyd's Register | 1012141 | Andrey Melnichenko. |
| Dragonfly | Lürssen | 2024 | 142.08 | 20 | 5.85 | 9,408 | 24 |  | Cayman Islands |  |  | Ex "Project AliBaba"; commissioned for Leonid Mikhelson, sold to Sergey Brin after sanctions blocked the original deal. |
| Nord | Lürssen | 2020/2021 | 142 | 19.5 | 5.15 | 9,250 | 20 max / 15 cruise |  | Russia |  | 9853785 | Andrey Melnichenko; ex "Project Opus". |
| Ocean Victory | Fincantieri | 2014 | 140 | 18.6 | 5.56 | 8,506 | 25 max / 18 cruise |  | Cayman Islands |  | 1011850 | Ex-owner Viktor Rashnikov (MMK Steel). |
| Scheherazade | Lürssen | 2020 | 140 | 23.3 | 5.1 | 10,167 | 19.5 max / 16.2 cruise |  | Cayman Islands |  | 9809980 | Linked to Vladimir Putin in reporting; ownership disputed/opaque. |
| Yas | Koninklijke Schelde | 1981 | 141 | 14.6 | 4.3 | 5,002 | 26 | 5,000 | Cayman Islands |  | 8652201 | UAE royal fleet ("Platinum" ex-name reported by some brokers). |
| Rising Sun | Lürssen | 2004 | 138 |  |  | 7,841 | 28 |  |  |  | 8982307 | Larry Ellison → sold to David Geffen. |
| Solaris | Lloyd Werft | 2021 | 139.7 | 21.3 | 5.95 | 11,247 |  |  | Bermuda |  | 9819820 | Roman Abramovich. |
| Al Salamah | HDW / Lürssen | 1999 | 139.29 | 23.5 | 5.0 | 12,234 |  |  | Saudi Arabia |  | 1007043 | Saudi royal yacht (Crown Prince Sultan bin Abdulaziz era). |
| Crescent | Lürssen | 2018 | 135.5 | 21.0 | 5.20 | 9,194 |  |  | Cayman Islands |  | 9785108 | Owned via Cayman entity "Black Dragon Minerals". |
| Deep Blue | Lürssen | 2026 | 134.2 | 19.8 | 5.1 | 9,079 |  |  | Cayman Islands |  |  | Reported owner Richard Liu (JD.com). |
| Serene | Fincantieri | 2011 | 133.9 | 18.5 | 5.5 | 8,231 |  |  | Bermuda |  | 1010090 | Yuri Shefler; frequently chartered (incl. by Bill Gates). |
| Al Mirqab | Peters Schiffbau | 2008 | 133 | 19.0 |  | 9,518 | 20.3 max / 18.7 cruise |  | Cayman Islands |  | 1009223 | Emir of Qatar; builder is Peters Schiffbau, not Lürssen (common mislabel). |
| Flying Fox | Lürssen | 2019 | 136 | 22.5 | 5.1 | 9,022 | 20 max / 15 cruise | 6,500 |  |  |  | World's largest charter yacht for several years. |
| Maryah | Elefsis Shipyard | 2014 | 125 | 17.0 | 5.60 | 5,650 | 18 max / 15 cruise |  | Cayman Islands |  |  | Rebuilt from a 1991 Russian research vessel over 5 years; Sheikh Tahnoon reported owner. Not to be confused with *A+* (ex-*Topaz*). |
| Katara | Lürssen | 2010 | 124.4 | 19.5 | 5.3 | ~8,010 | 20 max | 5,000+ | Qatar |  |  | Qatari royal yacht. |
| Golden Odyssey | Lürssen | 2015 | 123.23 | 20.0 | 5.1 | 7,690 | 19 max |  |  |  | 9648788 |  |
| Al Lusail | Lürssen | 2017 | 123 | 20 [conflict: 23] | 5.5 | 8,489 | 19 max / 12 cruise | 4,500 | Qatar | Lloyd's Register |  | (curated Beam cell from "20 (Boat International) / 23 (Wikipedia)") Beam conflict between sources — recorded rather than resolved; ex "Project Jupiter". |
| Koru | Oceanco | 2023 | 127 |  |  | 3,493 |  |  | Cayman Islands | Lloyd's Register | 9857298 | Jeff Bezos; sail-assisted (three masts). |
| Octopus | Lürssen/HDW | 2003 | 126.2 | 21.0 | 5.76 | 9,932 | 19 | 12,500 | Cayman Islands | Ice Class 1A | 1007213 | Built for Paul Allen; support/exploration vessel with two helipads and a submarine. |
| Breakthrough | Feadship | 2025 | 118.8 | 19 | 5.25 | 7,247 | 17 | 6,500 | Cayman Islands | Lloyd's Register |  | World's first hydrogen fuel-cell superyacht. |
| Launchpad | Feadship | 2024 | 118 | ~15.2 (50 ft) |  | 4,999 | 24 max / 19.6 (2-engine) | 6,000 | Marshall Islands |  |  | Mark Zuckerberg. |
| Multiverse | Kleven | 2017/2018 | 116.15 | 18.0 | 5.7 | 6,862 | 12 max / 8 cruise |  |  | DNV 1A1 |  | Ex "Ulysses" (U116); Graeme Hart. Note: a *different*, unrelated newer Feadship also named "Ulysses" was delivered to Hart in 2024 — do not conflate. |
| Turama | Rauma Shipyard | 1990 | 116.41 | 17.22 | 4.38 | 8,343 |  |  | Saudi Arabia |  | 8907216 |  |
| Kismet | Lürssen | 2024 | 122 | 17.8 | 4.8 | 4,918 | 18 | 6,000 |  |  |  | (curated Yacht cell from "Kismet (122 m)") Shahid Khan's second, larger *Kismet* — see rename note under the 95 m *Kismet* below. |
| Amadea | Lürssen | 2017 | 106.1 | 17.86 | 4.1 | 4,402 | 20 | 8,000 (at 13 kn) | Cayman Islands |  | 1012531 | Seized 2022 as a sanctioned Russian-linked asset (reportedly Suleiman Kerimov). |

## Yachts 100-119 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Renaissance | Freire | 2023 | 111.85 (source) vs 111.6 (graph) | ~18 |  | 6,950 |  |  |  |  |  | Beam figure from one source read as "18 feet," likely a units error for ~18 m — flagged, not corrected. |
| Le Grand Bleu | Bremer Vulkan (hull)/Kusch | 2000 | 112.8 |  |  |  | 17 max / 15 cruise |  |  |  |  | Eugene Shvidler (won from Abramovich in a wager, per reporting). |
| Radiant | Lürssen | 2009 | 110 | 16.3 | 4.5 | ~5,027 | 21 max / 16 cruise |  | Cayman Islands | Germanischer Lloyd |  | Ex "Project Darius" (originally for Boris Berezovsky); Abdulla Al Futtaim. |
| Kaos | Oceanco | 2017 | 110 / 110.1 | 16.4 | 4.4 | 4,523 |  |  |  |  |  | (curated Yacht cell from "Jubilee / Kaos") **Rename chain:** *Jubilee* → *Secret III* → *Kaos*. Graph carries "Jubilee" and "Kaos" as separate nodes for the same hull — merge candidate. |
| Bravo Eugenia | Oceanco | 2018 | 109 | 16.3 | 4.0 | 4,500 | 18 max / 14 cruise | 4,500+ | Cayman Islands |  |  | Jerry Jones. |
| Black Pearl | Oceanco | 2018 | 106.7 | 15.0 | 7.23 | 2,864 | 17.5 |  | Cayman Islands |  |  | World's largest DynaRig sailing yacht. |
| Lady Moura | Blohm+Voss | 1990 | 105 | 18.5 | 5.5 |  | 20+ |  | Nassau |  | 1002380 |  |
| Mar | Benetti | 2018 | 107 | 14.4 | 4.5 | 3,900 | 18.5 |  |  |  | 1013005 | (curated Yacht cell from "Lana / Mar") **Rename:** *Lana* → *Mar* after a 2023 sale to Sheikh Suroor bin Mohammed Al Nahyan. Graph carries both names as separate nodes. |
| Andromeda | Kleven | 2016 | 107.39 | 18.01 | 5.011 | 5,937 | 16.4 max |  | Cayman Islands |  | 9692545 |  |
| Pelorus | Lürssen | 2003 | 114.5 | 17.2 | 4.66 | 5,403 |  |  | St Vincent & Grenadines | DNV |  | Sold to Roman Abramovich on her maiden voyage. |
| Moonrise | Feadship | 2020 | 99.95 | 15.5 | 4.2 | 3,945 | 19 max / 16 cruise |  | Cayman Islands |  |  |  |
| Symphony | Feadship | 2015 | 101.5 | 14.1 | 4.1 | 3,463 | 22 max / 14 cruise |  | Cayman Islands |  | 1012098 | Bernard Arnault (LVMH). |

## Yachts 85-99 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sophia | Feadship | 2017 | 96.55 | 14.5 | 3.7 | 2,999 |  |  | Cayman Islands |  |  | Ex "Faith"; sold by Lawrence Stroll to Michael Latifi. Graph carries "Sophia" nodes at both 108 m and 97 m — likely the same 96.55 m hull duplicated/mis-scaled. |
| Vava II | Devonport | 2012 | 96 | 17.3 | 4.8 | 3,933 |  |  | Cayman Islands |  | 1010387 | Bertarelli family. |
| Tatoosh | Nobiskrug | 2000 | 92.42 | 14.95 | 5.16 | 3,229 | 16 | 7,846 | Cayman Islands |  | 1006336 | Built for Craig McCaw; later Paul Allen. |
| Queen Miri | Neorion | 2004 | 91.5 | 14.4 | 4.2 | 3,367 |  |  | Marshall Islands |  |  | Ex "Annaliesse"/"Delma"; hull extended from 85 m to 91.5 m in a 2016 refit. |
| Lady Lara | Lürssen | 2015 | 91 | 14.35 | 4.0 | 2,945 |  |  | Cayman Islands |  | 1012311 | Ex "Project Orchid". |
| Athena | Royal Huisman | 2004 | 90 | 12.20 | 5.77 | 1,103 | 18.9 max / 14 cruise | 4,000 | Cayman Islands |  |  | Sailing yacht (3-masted schooner) built for Jim Clark. |
| Nero | Corsair Yachts (Yantai Raffles) | 2007 | 90.1 | 12.03 | 4.87 | 1,957 |  |  | Cayman Islands |  | 1008449 |  |
| Phoenix 2 | Lürssen | 2010 | 90.02 | 13.8 | 3.75 | 2,667 | 18 max / 14 cruise | 6,000 |  |  |  | Winch Design's largest hull at time of delivery. |
| Lionheart | Benetti | 2016 | 90 |  |  |  | 18 max / 16 cruise |  |  | Lloyd's Register | 1012323 | Sir Philip Green. |
| Musashi | Feadship | 2011 | 87.78 | 13.9 | 4.1 | 2,463 | 20.9 max / 18 cruise | 6,000 | USA | Lloyd's |  | Larry Ellison. |
| Maltese Falcon | Perini Navi | 2006 | 88.1 | 12.6 | 6.0–11.0 | 1,157 |  |  | Malta (ex-BVI) | ABS | 9384552 | DynaRig sailing yacht. |
| Le Ponant | — | 1991 | 87.7 |  |  |  |  |  | France |  | 8914219 | 3-masted sail cruiser; famous for a 2008 Somali pirate hijacking. |
| Aquila | Derecktor | 2010 | 85.6 | 14.3 | 4.2 | 2,998 | 17 max / 15 cruise | 5,000 | Isle of Man |  |  | Ex "Cakewalk". |
| Wanderlust | SilverYachts | 2022 | 85.3 | 11.0 | 2.3 | 1,561 | 23 |  | Marshall Islands |  | 9854143 | Fast aluminium explorer. |
| Bold | SilverYachts | 2019 | 85.3 | 11.0 | 2.8 | 1,551 | 23 max / 18 cruise | 7,000 | Marshall Islands |  | 1013030 |  |
| Solandge | Lürssen | 2013 | 85.1 | 13.8 | 3.9 | 2,899 | 18 max / 15 cruise |  |  |  |  | Prince Muqrin bin Abdulaziz. |
| O'Ptasia | Golden Yachts | 2018 | 85 | 13.8 | 3.6 | 2,350 | 20 max / 16 cruise | 10,015 | Malta |  |  |  |
| Savannah | Feadship | 2015 | 83.5 | 12.5 | 3.95 | 2,305 | 17 max / 14 cruise | 6,500 | Cayman Islands |  |  | First true diesel-electric hybrid superyacht. |
| Chakra | Scheepswerf Gebr. van der Werf | 1963 (refits 2017, 2025) | 86 | 12.5 | 4.85 | 2,083 | 14 max / 12.8 cruise |  | St Vincent & Grenadines |  |  | Classic-era hull, extensively modernised. |
| Man of Steel | Oceanco | 2010 | 86 | 14.02 | 3.96 | 2,658 | 20 max / 16 cruise | 5,500 | Cayman Islands |  | 1010777 | Barry Zekelman. |
| Madsummer | Lürssen | 2019 | 95 | 14 | 3.9 | ~3,120–3,250 | 18 max / 12 cruise | 6,000 |  |  |  | (curated Yacht cell from "Madsummer / CC-Summer") **Rename:** *CC-Summer* → *Madsummer*. Graph carries both as separate nodes for the same hull. Jeffrey Soffer reported owner. |
| Lady S | Feadship | 2019 | 93 | 14.1 | 3.9 | 2,999 |  |  |  |  |  | Daniel Snyder. |
| Victorious | AKYACHT | 2021 | 85.01 | 14.2 | 4.4 | 2,291 |  |  | Cayman Islands |  | 1009912 |  |
| Whisper | Lürssen (built at Krögerwerft) | 2014 | 95.2 | 13.8 |  | 2,928 | 17 |  |  |  | 1012000 | (curated Yacht cell from "Kismet (95.2 m)") **Rename:** Shahid Khan's original *Kismet* was sold to Eric Schmidt in 2023 and renamed *Whisper*; Khan commissioned a new, larger *Kismet* (122 m, see above). Graph's 95 m "Kismet" node = today's *Whisper*. |

## Yachts 70-84 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Christina O | Canadian Vickers | 1943 (converted to yacht 1954) | 99.06 | 10.97 | 4.27 | 2,250 (displacement) | 19 |  | Malta |  | 8963818 | Ex-HMCS *Stormont*; converted for Aristotle Onassis, the first post-war superyacht. |
| Alfa Nero | Oceanco | 2007 | 82 | 14.2 | 3.9 | 2,500 | 21 | 6,630 | Cayman Islands |  | 1009376 | Seized by Antigua & Barbuda in 2022 (sanctioned Russian owner). |
| Romea | Abeking & Rasmussen | 2015 | 82.4 | 12.6 | 3.45 | 2,312 | 16.5 | 4,500 | Cayman Islands |  | 1012309 | Alexander Nesis. |
| Boardwalk | Feadship | 2021 | 76.5–77 | 12.3 | 3.6 | 1,848 | 17.5 |  | Cayman Islands |  | 9855317 | Tilman Fertitta. |
| Venus | Feadship | 2012 | 78.2 | 11.8 | 3.0 | 1,876 | 22 max / 16 cruise | 5,500 |  | Lloyd's |  | Commissioned by Steve Jobs (completed after his death); now Laurene Powell Jobs. |
| Yersin | Piriou | 2015 | 76.6 (graph: 78) | 13.0 | 4.5 | 2,198 |  |  | Oman [conflict: Malta] |  | 9666651 | (curated Flag cell from "Oman (one source) / Malta (another) — unresolved") Flag conflicting between sources — recorded, not resolved. |
| Kensho | Admiral — The Italian Sea Group | 2022 | 75.18 | 12.8 | 3.4 | 1,989 | 15.9 max / 13.6 cruise | 4,500 | Cayman Islands |  | 9854284 | Udo Müller. |
| Zeus | Blohm+Voss | 1991 | 74.5 | 11.2 | 3.2 | 1,150 | 32 max / 18 cruise |  | St Vincent & Grenadines |  |  | **Rename:** ex "Eco". Gas-turbine powered, exceptionally fast for her size. |
| Naia | Freire | 2011 | 73.6 (graph: 74) | 13.2 | 3.8 | 2,059 | 16 max / 14 cruise |  |  |  |  | Saleh Abdulla Kamel. |
| Titania | Lürssen | 2006 | 73 | 13.1 | 3.7 | 1,894 | 16 max / 12 cruise | 5,000 | UK |  | 1008695 |  |
| Cocoa Bean | Trinity Yachts | 2014 | 73.76 (graph: 74) | 12.0 | 4.0 | 1,590 | 15.5 max / 14.5 cruise |  | Cayman Islands | ABS Maltese Cross A1 |  |  |
| Talisman C | Turquoise Yachts | 2011 | 70.54 | 12.0 | 3.95 | 1,560 | 17 max / 15 cruise | 7,000 | Cayman Islands |  |  |  |
| Sherakhan | A. Vuyk & Zonen | 1966 | 69.65 (graph: 70) | 12.0 | 4.45 | 1,945 | 13 max / 11 cruise | 3,500 | Netherlands | Bureau Veritas | 6618823 | Classic explorer conversion. |

## TASK-021: suspect-yacht resolutions (research/round4/person-enrichment.md)

The Round 4 person-enrichment research pass independently investigated 9
yachts TASK-020's own research had flagged as suspect/unresolved (Fulk Al
Salamah, Blue, EIV, Luminance, Savarona, MYSTERE, Project Steel, H3, Dar)
while cross-checking yacht ownership claims. Verdicts: **Fulk Al Salamah,
Blue, Luminance, Savarona, Project Steel, H3, and Dar are all real,
confirmed vessels** with no LOA issue — their rows below simply add the
same beam/draft/GT/etc spec coverage as every other row in this file.
**EIV and MYSTERE both had a confirmed, quantified LOA data error** in the
graph (160m and 109m respectively) — the LOA cells below are curated to
the clean corrected values (48.8m and 33.29m); the graph node's own
`loa` attr is fixed by a SEPARATE mechanism,
`graphCleanup.js`'s `YACHT_QUALITY_CORRECTIONS` map (this
mapper never touches/stores the LOA column itself — see this file's own
intro).

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fulk Al Salamah | Mariotti Yachts (Italy) | 2016 | 164 | 21.04 | 6.01 | 11,000 | 16–22 (sources vary) | 3,000+ | Oman | n/a (not found) | 9714460 (unverified independently) | Oman Royal Yacht Squadron flagship, designer Studio de Jorio; value ~$500M. |
| Blue | Lürssen (Germany) | 2022 | 160.6 | 22.5 | 5.7 | 14,785 | n/a (not found; diesel‑electric hybrid) | n/a (not found) | n/a (not found) | n/a (not found) | n/a (not found) | Design by Terence Disdale; replaces Sheikh Mansour's earlier yacht Topaz; value ~$600M. |
| EIV | Rossinavi (Italy) | 2020 | 48.8 | 8.9 | n/a | 498 | 19 | 3,600 @ 10kn | n/a | n/a | n/a | (curated LOA cell to the clean corrected value; graph previously had 160m, a confirmed ~3.3x data error) Graph's 160m LOA is wrong by a factor of ~3.3x; real EIV is a 48.8m Rossinavi, guests/crew ~10/9, consistent with the sale-price figure the corpus carried over. |
| Luminance | Lürssen (Germany) | 2024 | 138.8 | 21 | 5.3 | 9,400 | 20+ | n/a (not found) | n/a (not found) | n/a (not found) | n/a (not found) | Exterior Espen Øino, interior Zuretti Design; owner "believed" (not self-confirmed) to be Rinat Akhmetov; value ~$500M. |
| Savarona | Blohm & Voss (Germany) | 1931 | 135.94 | 16 | 6.1 | 4,701 | 18 | n/a (not found) | Turkey | n/a (not found) | n/a (not found) | Turkish Republic presidential/state yacht; built for Emily Roebling Cadwalader, acquired by Turkey 1938. |
| MYSTERE | Mangusta / Overmarine Group (Italy) | 2023 | 33.29 | 7.39 | 1.9 | 247 | 25 | n/a (not found) | n/a (not found) | n/a (not found) | n/a (not found) | (curated LOA cell to the clean corrected value; graph previously had 109m, a confirmed feet-to-meters conversion bug — real figure is 109ft) Graph conflated "109 ft" with "109 m"; correct figure is 33.29m/109ft. Multiple other unrelated yachts also share the name "Mystere" (Vitters 43.2m sailing yacht 2006; Lloyds Ships 45.96m 1987) — none is a megayacht. |
| Project Steel | Bugari (Italy) | 1993 | 34 | 6.8 | 2.5 | 190 | 14 | 2,750 | Greece | n/a (not found) | n/a (not found) | Currently a Greek charter yacht (Istion Luxury Yachts); no connection found to any billionaire in this dataset — the "Steel" in the name appears coincidental to Barry Zekelman's "Man of Steel." |
| H3 | Oceanco (Netherlands) | 2000 (rebuilt 2023) | 105.26 | 14.78 | n/a | 3,521 | 18 | 6,000 | n/a | n/a (not found) | n/a (not found) | Real, well-documented vessel, but the graph's Eike Batista ownership link is **not corroborated** — public sources instead name Qatar's former PM, Vijay Mallya, and the Saudi Royal Family as prior owners. |
| Dar | Oceanco (Netherlands) | 2018 | 90.13 | 14.2 | 3.95 | n/a | 20 | n/a (not found) | n/a | n/a (not found) | n/a (not found) | Shark-inspired exterior by Luiz de Basto, interior by Nuvolari Lenard. Note: some brokers list this hull as later renamed "Luna" — a **different, smaller** vessel from the much more famous 115m Lloyd Werft Luna owned by Farkhad Akhmedov; do not conflate the two in the graph. |

## Sources

See research/round3/yacht-specs.md's own Sources section for the full per-yacht citation list (Wikipedia, Boat International, superyachttimes.com, yachtharbour.com, yachtcharterfleet.com, superyachtfan.com, yachtbuyer.com, itboat.com, vesselfinder.com, marinetraffic.com).
