# Yacht Spec Completion — Round 4, Lane L

Research pass targeting the largest, best-documented yachts in the graph
(`ingest/data/graph.json`, 605 yacht nodes) to close the beam / draft / GT /
speed / range / flag / class-society / IMO gap identified in the
beat-Wikipedia analysis. Priority list was the top ~220 yacht nodes by LOA
(all yachts ≥70 m), extracted directly from the graph rather than assumed.

Yacht name spelling matches the graph's `name` field exactly so the mapper
can resolve by name. Empty cells mean "not confirmed this pass," not zero.
Where sources conflicted, the discrepancy is recorded in Notes rather than
silently picking one number.

## Yachts ≥150 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Somnio | VARD (Fincantieri group) | — | 222 | 27 | | 33,500 | | | | | | Not yet delivered as of research date; largest private/residence yacht announced. Not a Feadship (common mislabel). |
| REV Ocean | Vard/Fincantieri | 2019 (launch); delivery pending | 194.9 | 22 | 5.25 | 19,235 | 17 max / 11 cruise | 21,120 | Norway | Polar Class 6 | 9840037 | Research/expedition vessel, not a private yacht in the strict sense. |
| Azzam | Lürssen | 2013 | 180 | 20.8 | 4.3 | 13,136 | 32+ | | Abu Dhabi, UAE | | 9693367 | World's longest private motor yacht. |
| Scenic Eclipse | Uljanik | 2019 | 166.1 | 21.5 | | 17,545 | 19.5 max / 17 service | | Bahamas (ex-Malta) | | 9797371 | Expedition cruise ship, borderline "yacht" classification. |
| Golden Horizon | Brodosplit | 2017/2021 | 162.22 | 18.5 | | 8,770 | 20 max / 16 cruise | | Croatia | | 9793545 | 5-masted tall ship, largest sailing vessel by GT. |
| Eclipse | Blohm+Voss | 2010 | 162.5 | 22.0 | 5.9 | 13,000 | 22 | | Bermuda | | 1009613 | Roman Abramovich. |
| Dubai | Blohm+Voss/Lürssen | 2006 | 162 | 22 | 5 | 13,470 | 26 | 8,500 | Dubai, UAE | | 1006324 | Ruler of Dubai. |
| Al Said | Lürssen | 2008 | 155 | 24.0 | 5.2 | 15,850 | 25.2 max / 14.5 cruise | | Oman | | 9463774 | Sultan of Oman's yacht. |
| Dilbar | Lürssen | 2016 | 156 | 23.5 | 6.0 | 15,917 | 22.5 max / 18 cruise | | Cayman Islands | | 9661792 | Built as "Project Omar"; seized by Germany 2022 (Usmanov sanctions). |
| Opera | Lürssen | 2023 | 146.35 | 21.5 | 6.0 | 12,518 | | | Cayman Islands | | 1012933 | Reported owner Sheikh Abdullah bin Zayed Al Nahyan. |
| El Mahrousa | Samuda Brothers | 1865 (lengthened 1872, 1905) | 146 | 13 | 5.3 | 4,561 | 16 max / 13 cruise | | Egypt | | | Oldest active superyacht in the world; Egyptian state yacht. |
| Prince Abdulaziz | Helsingør Værft | 1984 | 147 | 18.3 | 4.9 | 8,233 | | | | | | Saudi royal yacht; designed by Maierform. Graph has 2 duplicate nodes for this yacht. |
| A+ | Lürssen | 2012 | 147 | | | | | | | | | **Rename:** formerly *Topaz*. Beam/draft/GT/IMO not confirmed this pass. |
| MOSAIQUE | — | — | 164 (graph) | | | | | | | | | **Conflict:** the only well-documented "Mosaique" found is a 49.9 m Turquoise Yachts vessel (IMO 8976009) — a different, much smaller boat. The 164 m graph value could not be corroborated; likely a data/parse error worth a mapper-side QA flag. |
| Blue | — | — | 160.6 (graph) | | | | | | | | | Could not corroborate a 160.6 m yacht named "Blue" against any source this pass; flagged for QA (possible confusion with Jeff Bezos's *Koru*/*Abeona* chase boat "Blue", or a parse artifact). |
| EIV | — | — | 160 (graph) | | | | | | | | | Not found this pass. |
| Fulk Al Salamah | — | — | 164 (graph) | | | | | | | | | Oman royal fleet supply/support vessel; not found this pass — recommend as a priority for the next research pass. |
| Evrima | — | — | 190 (graph) | | | | | | | | | Ritz-Carlton Yacht Collection's *Evrima* — a commercial cruise vessel, not a private yacht; not researched this pass. |

## Yachts 120–149 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sailing Yacht A | Nobiskrug | 2017 | 144.03 | 24.80 | 8.00 | 12,558 | 21 | 5,340 | Sierra Leone (ex-Bermuda, ex-Isle of Man) | Lloyd's Register | 1012141 | Andrey Melnichenko. |
| Dragonfly | Lürssen | 2024 | 142.08 | 20 | 5.85 | 9,408 | 24 | | Cayman Islands | | | Ex "Project AliBaba"; commissioned for Leonid Mikhelson, sold to Sergey Brin after sanctions blocked the original deal. |
| Nord | Lürssen | 2020/2021 | 142 | 19.5 | 5.15 | 9,250 | 20 max / 15 cruise | | Russia | | 9853785 | Andrey Melnichenko; ex "Project Opus". |
| Ocean Victory | Fincantieri | 2014 | 140 | 18.6 | 5.56 | 8,506 | 25 max / 18 cruise | | Cayman Islands | | 1011850 | Ex-owner Viktor Rashnikov (MMK Steel). |
| Scheherazade | Lürssen | 2020 | 140 | 23.3 | 5.1 | 10,167 | 19.5 max / 16.2 cruise | | Cayman Islands | | 9809980 | Linked to Vladimir Putin in reporting; ownership disputed/opaque. |
| Yas | Koninklijke Schelde | 1981 | 141 | 14.6 | 4.3 | 5,002 | 26 | 5,000 | Cayman Islands | | 8652201 | UAE royal fleet ("Platinum" ex-name reported by some brokers). |
| Rising Sun | Lürssen | 2004 | 138 | | | 7,841 | 28 | | | | 8982307 | Larry Ellison → sold to David Geffen. |
| Solaris | Lloyd Werft | 2021 | 139.7 | 21.3 | 5.95 | 11,247 | | | Bermuda | | 9819820 | Roman Abramovich. |
| Al Salamah | HDW / Lürssen | 1999 | 139.29 | 23.5 | 5.0 | 12,234 | | | Saudi Arabia | | 1007043 | Saudi royal yacht (Crown Prince Sultan bin Abdulaziz era). |
| Crescent | Lürssen | 2018 | 135.5 | 21.0 | 5.20 | 9,194 | | | Cayman Islands | | 9785108 | Owned via Cayman entity "Black Dragon Minerals". |
| Deep Blue | Lürssen | 2026 | 134.2 | 19.8 | 5.1 | 9,079 | | | Cayman Islands | | | Reported owner Richard Liu (JD.com). |
| Serene | Fincantieri | 2011 | 133.9 | 18.5 | 5.5 | 8,231 | | | Bermuda | | 1010090 | Yuri Shefler; frequently chartered (incl. by Bill Gates). |
| Al Mirqab | Peters Schiffbau | 2008 | 133 | 19.0 | | 9,518 | 20.3 max / 18.7 cruise | | Cayman Islands | | 1009223 | Emir of Qatar; builder is Peters Schiffbau, not Lürssen (common mislabel). |
| Flying Fox | Lürssen | 2019 | 136 | 22.5 | 5.1 | 9,022 | 20 max / 15 cruise | 6,500 | | | | World's largest charter yacht for several years. |
| Maryah | Elefsis Shipyard | 2014 | 125 | 17.0 | 5.60 | 5,650 | 18 max / 15 cruise | | Cayman Islands | | | Rebuilt from a 1991 Russian research vessel over 5 years; Sheikh Tahnoon reported owner. Not to be confused with *A+* (ex-*Topaz*). |
| Katara | Lürssen | 2010 | 124.4 | 19.5 | 5.3 | ~8,010 | 20 max | 5,000+ | Qatar | | | Qatari royal yacht. |
| Golden Odyssey | Lürssen | 2015 | 123.23 | 20.0 | 5.1 | 7,690 | 19 max | | | | 9648788 | |
| Al Lusail | Lürssen | 2017 | 123 | 20 (Boat International) / 23 (Wikipedia) | 5.5 | 8,489 | 19 max / 12 cruise | 4,500 | Qatar | Lloyd's Register | | Beam conflict between sources — recorded rather than resolved; ex "Project Jupiter". |
| Koru | Oceanco | 2023 | 127 | | | 3,493 | | | Cayman Islands | Lloyd's Register | 9857298 | Jeff Bezos; sail-assisted (three masts). |
| Octopus | Lürssen/HDW | 2003 | 126.2 | 21.0 | 5.76 | 9,932 | 19 | 12,500 | Cayman Islands | Ice Class 1A | 1007213 | Built for Paul Allen; support/exploration vessel with two helipads and a submarine. |
| Breakthrough | Feadship | 2025 | 118.8 | 19 | 5.25 | 7,247 | 17 | 6,500 | Cayman Islands | Lloyd's Register | | World's first hydrogen fuel-cell superyacht. |
| Launchpad | Feadship | 2024 | 118 | ~15.2 (50 ft) | | 4,999 | 24 max / 19.6 (2-engine) | 6,000 | Marshall Islands | | | Mark Zuckerberg. |
| Multiverse | Kleven | 2017/2018 | 116.15 | 18.0 | 5.7 | 6,862 | 12 max / 8 cruise | | | DNV 1A1 | | Ex "Ulysses" (U116); Graeme Hart. Note: a *different*, unrelated newer Feadship also named "Ulysses" was delivered to Hart in 2024 — do not conflate. |
| Turama | Rauma Shipyard | 1990 | 116.41 | 17.22 | 4.38 | 8,343 | | | Saudi Arabia | | 8907216 | |
| Kismet (122 m) | Lürssen | 2024 | 122 | 17.8 | 4.8 | 4,918 | 18 | 6,000 | | | | Shahid Khan's second, larger *Kismet* — see rename note under the 95 m *Kismet* below. |
| Amadea | Lürssen | 2017 | 106.1 | 17.86 | 4.1 | 4,402 | 20 | 8,000 (at 13 kn) | Cayman Islands | | 1012531 | Seized 2022 as a sanctioned Russian-linked asset (reportedly Suleiman Kerimov). |

## Yachts 100–119 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Renaissance | Freire | 2023 | 111.85 (source) vs 111.6 (graph) | ~18 | | 6,950 | | | | | | Beam figure from one source read as "18 feet," likely a units error for ~18 m — flagged, not corrected. |
| Le Grand Bleu | Bremer Vulkan (hull)/Kusch | 2000 | 112.8 | | | | 17 max / 15 cruise | | | | | Eugene Shvidler (won from Abramovich in a wager, per reporting). |
| Radiant | Lürssen | 2009 | 110 | 16.3 | 4.5 | ~5,027 | 21 max / 16 cruise | | Cayman Islands | Germanischer Lloyd | | Ex "Project Darius" (originally for Boris Berezovsky); Abdulla Al Futtaim. |
| Jubilee / Kaos | Oceanco | 2017 | 110 / 110.1 | 16.4 | 4.4 | 4,523 | | | | | | **Rename chain:** *Jubilee* → *Secret III* → *Kaos*. Graph carries "Jubilee" and "Kaos" as separate nodes for the same hull — merge candidate. |
| Bravo Eugenia | Oceanco | 2018 | 109 | 16.3 | 4.0 | 4,500 | 18 max / 14 cruise | 4,500+ | Cayman Islands | | | Jerry Jones. |
| Black Pearl | Oceanco | 2018 | 106.7 | 15.0 | 7.23 | 2,864 | 17.5 | | Cayman Islands | | | World's largest DynaRig sailing yacht. |
| Lady Moura | Blohm+Voss | 1990 | 105 | 18.5 | 5.5 | | 20+ | | Nassau | | 1002380 | |
| Lana / Mar | Benetti | 2018 | 107 | 14.4 | 4.5 | 3,900 | 18.5 | | | | 1013005 | **Rename:** *Lana* → *Mar* after a 2023 sale to Sheikh Suroor bin Mohammed Al Nahyan. Graph carries both names as separate nodes. |
| Andromeda | Kleven | 2016 | 107.39 | 18.01 | 5.011 | 5,937 | 16.4 max | | Cayman Islands | | 9692545 | |
| Pelorus | Lürssen | 2003 | 114.5 | 17.2 | 4.66 | 5,403 | | | St Vincent & Grenadines | DNV | | Sold to Roman Abramovich on her maiden voyage. |
| Moonrise | Feadship | 2020 | 99.95 | 15.5 | 4.2 | 3,945 | 19 max / 16 cruise | | Cayman Islands | | | |
| Symphony | Feadship | 2015 | 101.5 | 14.1 | 4.1 | 3,463 | 22 max / 14 cruise | | Cayman Islands | | 1012098 | Bernard Arnault (LVMH). |

## Yachts 85–99 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sophia | Feadship | 2017 | 96.55 | 14.5 | 3.7 | 2,999 | | | Cayman Islands | | | Ex "Faith"; sold by Lawrence Stroll to Michael Latifi. Graph carries "Sophia" nodes at both 108 m and 97 m — likely the same 96.55 m hull duplicated/mis-scaled. |
| Vava II | Devonport | 2012 | 96 | 17.3 | 4.8 | 3,933 | | | Cayman Islands | | 1010387 | Bertarelli family. |
| Tatoosh | Nobiskrug | 2000 | 92.42 | 14.95 | 5.16 | 3,229 | 16 | 7,846 | Cayman Islands | | 1006336 | Built for Craig McCaw; later Paul Allen. |
| Queen Miri | Neorion | 2004 | 91.5 | 14.4 | 4.2 | 3,367 | | | Marshall Islands | | | Ex "Annaliesse"/"Delma"; hull extended from 85 m to 91.5 m in a 2016 refit. |
| Lady Lara | Lürssen | 2015 | 91 | 14.35 | 4.0 | 2,945 | | | Cayman Islands | | 1012311 | Ex "Project Orchid". |
| Athena | Royal Huisman | 2004 | 90 | 12.20 | 5.77 | 1,103 | 18.9 max / 14 cruise | 4,000 | Cayman Islands | | | Sailing yacht (3-masted schooner) built for Jim Clark. |
| Nero | Corsair Yachts (Yantai Raffles) | 2007 | 90.1 | 12.03 | 4.87 | 1,957 | | | Cayman Islands | | 1008449 | |
| Phoenix 2 | Lürssen | 2010 | 90.02 | 13.8 | 3.75 | 2,667 | 18 max / 14 cruise | 6,000 | | | | Winch Design's largest hull at time of delivery. |
| Lionheart | Benetti | 2016 | 90 | | | | 18 max / 16 cruise | | | Lloyd's Register | 1012323 | Sir Philip Green. |
| Musashi | Feadship | 2011 | 87.78 | 13.9 | 4.1 | 2,463 | 20.9 max / 18 cruise | 6,000 | USA | Lloyd's | | Larry Ellison. |
| Maltese Falcon | Perini Navi | 2006 | 88.1 | 12.6 | 6.0–11.0 | 1,157 | | | Malta (ex-BVI) | ABS | 9384552 | DynaRig sailing yacht. |
| Le Ponant | — | 1991 | 87.7 | | | | | | France | | 8914219 | 3-masted sail cruiser; famous for a 2008 Somali pirate hijacking. |
| Aquila | Derecktor | 2010 | 85.6 | 14.3 | 4.2 | 2,998 | 17 max / 15 cruise | 5,000 | Isle of Man | | | Ex "Cakewalk". |
| Wanderlust | SilverYachts | 2022 | 85.3 | 11.0 | 2.3 | 1,561 | 23 | | Marshall Islands | | 9854143 | Fast aluminium explorer. |
| Bold | SilverYachts | 2019 | 85.3 | 11.0 | 2.8 | 1,551 | 23 max / 18 cruise | 7,000 | Marshall Islands | | 1013030 | |
| Solandge | Lürssen | 2013 | 85.1 | 13.8 | 3.9 | 2,899 | 18 max / 15 cruise | | | | | Prince Muqrin bin Abdulaziz. |
| O'Ptasia | Golden Yachts | 2018 | 85 | 13.8 | 3.6 | 2,350 | 20 max / 16 cruise | 10,015 | Malta | | | |
| Savannah | Feadship | 2015 | 83.5 | 12.5 | 3.95 | 2,305 | 17 max / 14 cruise | 6,500 | Cayman Islands | | | First true diesel-electric hybrid superyacht. |
| Chakra | Scheepswerf Gebr. van der Werf | 1963 (refits 2017, 2025) | 86 | 12.5 | 4.85 | 2,083 | 14 max / 12.8 cruise | | St Vincent & Grenadines | | | Classic-era hull, extensively modernised. |
| Man of Steel | Oceanco | 2010 | 86 | 14.02 | 3.96 | 2,658 | 20 max / 16 cruise | 5,500 | Cayman Islands | | 1010777 | Barry Zekelman. |
| Madsummer / CC-Summer | Lürssen | 2019 | 95 | 14 | 3.9 | ~3,120–3,250 | 18 max / 12 cruise | 6,000 | | | | **Rename:** *CC-Summer* → *Madsummer*. Graph carries both as separate nodes for the same hull. Jeffrey Soffer reported owner. |
| Lady S | Feadship | 2019 | 93 | 14.1 | 3.9 | 2,999 | | | | | | Daniel Snyder. |
| Victorious | AKYACHT | 2021 | 85.01 | 14.2 | 4.4 | 2,291 | | | Cayman Islands | | 1009912 | |
| Kismet (95.2 m) | Lürssen (built at Krögerwerft) | 2014 | 95.2 | 13.8 | | 2,928 | 17 | | | | 1012000 | **Rename:** Shahid Khan's original *Kismet* was sold to Eric Schmidt in 2023 and renamed *Whisper*; Khan commissioned a new, larger *Kismet* (122 m, see above). Graph's 95 m "Kismet" node = today's *Whisper*. |

## Yachts 70–84 m

| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Christina O | Canadian Vickers | 1943 (converted to yacht 1954) | 99.06 | 10.97 | 4.27 | 2,250 (displacement) | 19 | | Malta | | 8963818 | Ex-HMCS *Stormont*; converted for Aristotle Onassis, the first post-war superyacht. |
| Alfa Nero | Oceanco | 2007 | 82 | 14.2 | 3.9 | 2,500 | 21 | 6,630 | Cayman Islands | | 1009376 | Seized by Antigua & Barbuda in 2022 (sanctioned Russian owner). |
| Romea | Abeking & Rasmussen | 2015 | 82.4 | 12.6 | 3.45 | 2,312 | 16.5 | 4,500 | Cayman Islands | | 1012309 | Alexander Nesis. |
| Boardwalk | Feadship | 2021 | 76.5–77 | 12.3 | 3.6 | 1,848 | 17.5 | | Cayman Islands | | 9855317 | Tilman Fertitta. |
| Venus | Feadship | 2012 | 78.2 | 11.8 | 3.0 | 1,876 | 22 max / 16 cruise | 5,500 | | Lloyd's | | Commissioned by Steve Jobs (completed after his death); now Laurene Powell Jobs. |
| Yersin | Piriou | 2015 | 76.6 (graph: 78) | 13.0 | 4.5 | 2,198 | | | Oman (one source) / Malta (another) — unresolved | | 9666651 | Flag conflicting between sources — recorded, not resolved. |
| Kensho | Admiral — The Italian Sea Group | 2022 | 75.18 | 12.8 | 3.4 | 1,989 | 15.9 max / 13.6 cruise | 4,500 | Cayman Islands | | 9854284 | Udo Müller. |
| Zeus | Blohm+Voss | 1991 | 74.5 | 11.2 | 3.2 | 1,150 | 32 max / 18 cruise | | St Vincent & Grenadines | | | **Rename:** ex "Eco". Gas-turbine powered, exceptionally fast for her size. |
| Naia | Freire | 2011 | 73.6 (graph: 74) | 13.2 | 3.8 | 2,059 | 16 max / 14 cruise | | | | | Saleh Abdulla Kamel. |
| Titania | Lürssen | 2006 | 73 | 13.1 | 3.7 | 1,894 | 16 max / 12 cruise | 5,000 | UK | | 1008695 | |
| Cocoa Bean | Trinity Yachts | 2014 | 73.76 (graph: 74) | 12.0 | 4.0 | 1,590 | 15.5 max / 14.5 cruise | | Cayman Islands | ABS Maltese Cross A1 | | |
| Talisman C | Turquoise Yachts | 2011 | 70.54 | 12.0 | 3.95 | 1,560 | 17 max / 15 cruise | 7,000 | Cayman Islands | | | |
| Sherakhan | A. Vuyk & Zonen | 1966 | 69.65 (graph: 70) | 12.0 | 4.45 | 1,945 | 13 max / 11 cruise | 3,500 | Netherlands | Bureau Veritas | 6618823 | Classic explorer conversion. |

## Sources

- [Azzam (2013 yacht) — Wikipedia](https://en.wikipedia.org/wiki/Azzam_(2013_yacht))
- [Eclipse (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Eclipse_(yacht))
- [Dilbar (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Dilbar_(yacht))
- [REV Ocean — Wikipedia](https://en.wikipedia.org/wiki/REV_Ocean)
- [Dubai (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Dubai_(yacht))
- [Rising Sun (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Rising_Sun_(yacht))
- [Al Said (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Al_Said_(yacht))
- [Al Mirqab (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Al_Mirqab_(yacht))
- [Serene (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Serene_(yacht))
- [Octopus (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Octopus_(yacht))
- [Sailing Yacht A — Wikipedia](https://en.wikipedia.org/wiki/Sailing_Yacht_A)
- [Solaris (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Solaris_(yacht))
- [Scheherazade (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Scheherazade_(yacht))
- [Lady Moura — Wikipedia](https://en.wikipedia.org/wiki/Lady_Moura)
- [Koru (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Koru_(yacht))
- [Christina O — Wikipedia](https://en.wikipedia.org/wiki/Christina_O)
- [Maltese Falcon (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Maltese_Falcon_(yacht))
- [El Mahrousa — Wikipedia](https://en.wikipedia.org/wiki/El_Mahrousa)
- [Golden Horizon — Wikipedia](https://en.wikipedia.org/wiki/Golden_Horizon)
- [Scenic Eclipse — Wikipedia](https://en.wikipedia.org/wiki/Scenic_Eclipse)
- [Amadea (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Amadea_(yacht))
- [Alfa Nero — Wikipedia](https://en.wikipedia.org/wiki/Alfa_Nero)
- [Whisper (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Whisper_(yacht))
- [Andromeda (2015 yacht) — Wikipedia](https://en.wikipedia.org/wiki/Andromeda_(2015_yacht))
- [Vava II — Wikipedia](https://en.wikipedia.org/wiki/Vava_II)
- [Bravo Eugenia (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Bravo_Eugenia_(yacht))
- [Musashi (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Musashi_(yacht))
- [Tatoosh (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Tatoosh_(yacht))
- [Black Pearl (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Black_Pearl_(yacht))
- [Somnio (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Somnio_(yacht))
- [Breakthrough (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Breakthrough_(yacht))
- [Nord (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Nord_(yacht))
- [Ocean Victory (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Ocean_Victory_(yacht))
- [Dragonfly (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Dragonfly_(yacht))
- [Crescent (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Crescent_(yacht))
- [Le Ponant — Wikipedia](https://en.wikipedia.org/wiki/Le_Ponant)
- [Kismet (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Kismet_(yacht))
- [Pelorus (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Pelorus_(yacht))
- [Nero (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Nero_(yacht))
- [Venus (yacht) — Wikipedia](https://en.wikipedia.org/wiki/Venus_(yacht))
- [List of yachts built by Lürssen — Wikipedia](https://en.wikipedia.org/wiki/List_of_yachts_built_by_L%C3%BCrssen)
- Boat International Superyacht Directory (per-yacht spec pages), superyachttimes.com, yachtharbour.com, yachtcharterfleet.com, superyachtfan.com, yachtbuyer.com, itboat.com, vesselfinder.com, marinetraffic.com — used throughout for beam/draft/GT/speed/range/flag/IMO where Wikipedia lacked a dedicated infobox.

## Coverage notes

- **Extraction method:** Because the ingestion graph (`ingest/data/graph.json`)
  is too large to load with a script-execution tool in this environment, the
  priority list was built by grepping `"loa": { "meters":` blocks directly and
  reconstructing the sorted list by hand — 267 yacht nodes have LOA ≥ 70 m.
  This pass researched **~95 distinct hulls** in depth (several graph nodes
  map to the same physical hull — see renames below) plus flagged 6 more with
  partial or conflicting data, out of that ~267-node pool. It falls short of
  the 150-hull target; the remaining ~150–170 nodes in the 70–95 m band
  (mostly single-name charter yachts like *Elements*, *Freedom*, *Force Blue*,
  *Q*, *Siren*, *Stella M*, etc.) are generic enough that web search did not
  return confident, disambiguated results in the time available and were
  deliberately left out rather than guessed.
- **Renames found (a known graph hazard, confirmed this pass):**
  - *Kismet* (95.2 m, Lürssen 2014) → **Whisper** (renamed 2023, new owner
    Eric Schmidt). The graph's 95 m "Kismet" node is this vessel. Shahid Khan
    (the original *Kismet* owner) commissioned an unrelated, larger 122 m
    *Kismet* (Lürssen, 2024) — the graph's other "Kismet" node.
  - *Jubilee* (110 m, Oceanco 2017) → *Secret III* → **Kaos** (current name).
    Graph has separate "Jubilee" and "Kaos" nodes for one hull.
  - *Lana* (107 m, Benetti 2018) → **Mar** (renamed after a 2023 sale). Graph
    has separate "Lana" and "Mar" nodes for one hull.
  - *CC-Summer* (95 m, Lürssen 2019) → **Madsummer**. Graph has separate
    "CC-Summer" and "Madsummer" nodes for one hull.
  - *Topaz* → **A+** (147 m, Lürssen 2012).
  - *Eco* → **Zeus** (74.5 m, Blohm+Voss 1991).
  - *Ulysses* → **Multiverse** (116.15 m Kleven, 2017/2018) — note there is a
    second, unrelated, newer Feadship also called *Ulysses* (2024) for the
    same owner (Graeme Hart); do not merge the two.
- **Weakest fields across the whole pass:** classification society (rarely
  published outside Lloyd's Register/ABS/DNV flagship cases) and range
  (frequently omitted from public broker listings). Draft was the next-
  weakest; beam and GT were the most reliably sourced of the seven target
  fields, IMO number came through for most Cayman/Marshall Islands/Bermuda-
  flagged yachts over ~85 m but is genuinely unassigned or unpublished for
  many yachts under ~3,000 GT.
  - **Fulk Al Salamah**, **Blue** (160.6 m graph value could not be
    corroborated against any source — flagged for a graph-side QA check
    rather than silently dropped), **EIV**, **MOSAIQUE** (164 m graph value
    likely conflated with a much smaller 49.9 m Turquoise Yachts vessel of
    the same name), **Luminance**, **Savarona**, **MYSTERE**, **Project
    Steel**, **H3**, and **Dar** were on the priority list but returned no
    confident results this pass and are good candidates for the next
    research pass, roughly in that priority order.
  - The RIO node (203 m in the graph) could not be matched to any real
    203 m yacht — every source found for "RIO" describes a 62 m CRN motor
    yacht. This LOA value looks like a data/parsing error and should be
    QA'd against the source document rather than treated as a research gap.
