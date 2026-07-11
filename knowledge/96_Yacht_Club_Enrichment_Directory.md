# Yacht Club Enrichment Directory

Curated from `research/round4/club-enrichment.md` for TASK-021. Enriches
62 existing club nodes (city/founded/website confirm-or-add), via
`clubMapper.js`'s third guard (`isClubEnrichmentTable`/
`mapClubEnrichmentTables` — mirrors `engineMapper.js`'s/`marinaMapper.js`'s
dual/triple-guard-per-file pattern). This mapper NEVER creates a new club
node — 62 clubs enrich-only, per the ticket.

## Curation notes

**2 rows excluded from this file** (the research doc's own table has 64
rows, not 62 — the discrepancy is these 2, not an arithmetic slip): "First
Yacht Club in Florida" and "The Florida Yacht Club (duplicate entry in
sources)". Both rows' own Notes explicitly say NOT to enrich them
separately ("almost certainly the same institution recorded twice...
Recommend a dedup pass rather than independent enrichment"; "do not
enrich separately — merge with 'Florida Yacht Club'"). Both ARE real,
distinct existing graph nodes (`club:first-yacht-club-in-florida`,
`club:the-florida-yacht-club-duplicate-entry-in-sources`) — merged onto
the canonical `club:florida-yacht-club` by `graphCleanup.js`'s
`CLUB_MERGE_MAP`, not enriched by this file.

**7 dupe pairs** (research's Coverage notes) are handled entirely by
`graphCleanup.js`'s `CLUB_MERGE_MAP` — not by this mapper or this file.
See that module's own header for the full ledger (every pair, with its
canonical-name rationale).

**4 founded-year cells curated into the conflicts convention** (per the
ticket: "never silent overwrite" — the graph's EXISTING founded value, if
any, always stays primary; the differing research value is recorded in
`attrs.conflicts.founded`). Each cell below was rewritten to show ONLY
the alternate/most-defensible value as the primary parseable year
(moving the "graph says X" framing into this row's own Notes), so the
mapper's generic first-non-empty-wins-plus-conflict comparison (identical
convention to `yachtSpecMapper.js`'s beam/draft handling) naturally
detects and records the disagreement against whatever the graph already
has:

| Club | Curated Founded cell | Why |
|---|---|---|
| Royal Perth Yacht Club | 1841/1865 | Graph already has 1876; club history's own earlier-origin claims recorded as a conflict rather than silently applied. |
| Hellenic Offshore Racing Club (HORC) | 1961 | Graph already has 1964 (likely its Aegean Rally's start year, not the club's own founding); web-sourced 1961 recorded as a conflict. |
| Charlotte Harbor Yacht Club | 1973 | Graph already has 1984; the club's own published history (1973) recorded as a conflict rather than silently substituted, even though it's arguably the more accurate figure. |
| Vero Beach Yacht Club | 1926 `[conflict: 1938 per club history book]` | The graph has NO existing founded value for this club at all, so the generic existing-value comparison has nothing to trigger against — this is the ONE row using the explicit `[conflict: ...]` marker (same convention as `yachtSpecMapper.js`'s Al Lusail/Yersin cells) to force both of the research's OWN two conflicting published accounts onto the node rather than silently picking one. |

**A 5th discrepancy — Cleveland Yacht Club / Cleveland Yachting Club
(graph 1904 vs. 1878/1888)** — is resolved via the DEDUP decision itself
(`graphCleanup.js`'s `CLUB_MERGE_MAP` keeps "Cleveland Yachting Club,"
which carries its own sourced 1878 founding year and real website,
cycrr.org, as canonical), not the conflicts mechanism — these are two
different graph nodes being consolidated, not one node's competing
attribute values.

**Famous clubs NOT added this round** (per the ticket's own explicit
decision, carried over from the research doc's scoping note): New York
Yacht Club, Royal Yacht Squadron (Cowes), Royal Ocean Racing Club, St.
Francis Yacht Club, Royal Sydney Yacht Squadron, Royal New Zealand Yacht
Squadron, Palm Beach Sailing Club, Biscayne Bay Yacht Club — none exist
as graph nodes (confirmed via the research pass's own targeted grep), and
this mapper never creates new club nodes, so they remain absent. Queued
as a future lane if wanted.

## Enriched clubs

| Club | City | Country | Founded | Website | Notes |
|---|---|---|---|---|---|
| Coral Reef Yacht Club | Coconut Grove, Miami | USA | 1955 | coralreefyachtclub.org | Founded as Royal Palm Yacht Club at George Engle's Bayshore Drive estate; hosts the Bacardi Cup, the largest Star-class regatta in North America (since 1978). |
| Key Biscayne Yacht Club | Key Biscayne | USA | 1955 (Jan 14) | kbyc.org | Started as a fundraising effort to install a hoisting crane in Hurricane Cove; charter filed Feb 3, 1955 with 214 charter members. |
| Florida Yacht Club | Jacksonville | USA | 1876 | thefloridayachtclub.org | Oldest social club in Jacksonville and 4th-oldest surviving yacht club in the US; driven by New York businessman William B. Astor Jr.; moved to Ortega in 1928 after the original clubhouse burned in the Great Fire of 1901. |
| San Diego Yacht Club | San Diego, CA | USA | 1886 | sdyc.org | Won the America's Cup three times (1987, 1988 — Dennis Conner; 1992 — Bill Koch/America³); hosted Cup defenses in 1988, 1992 and 1995. |
| Chicago Yacht Club | Chicago, IL | USA | 1875 | chicagoyachtclub.org | Organized by 37 yachtsmen; has hosted the Race to Mackinac since 1898, one of the oldest and largest annual freshwater distance races in the world. |
| Detroit Yacht Club | Detroit, MI | USA | 1868 | dyc.com | Clubhouse (1922–23, Mediterranean Revival, architect George D. Mason) sits on its own island off Belle Isle and is the largest yacht-club clubhouse in the United States. |
| Grosse Pointe Yacht Club | Grosse Pointe Shores, MI | USA | 1913 | gpyc.org | Already fully populated in the graph (founded + website) — included here for cross-check confirmation only; no further discrepancy found. |
| Yacht Club de Monaco | Monaco | Monaco | 1953 | yacht-club-monaco.mc | Founded by Prince Rainier III; presided since 1984 by Prince Albert II; current clubhouse designed by Norman Foster, opened 2014; ~2,500 members from 81 nationalities. |
| Royal Canadian Yacht Club | Toronto, ON | Canada | 1852 | rcyc.ca | Began as the Toronto Boat Club (1850); granted Royal warrant by Queen Victoria in 1854; summer clubhouse on the Toronto Islands. |
| Royal Vancouver Yacht Club | Vancouver, BC | Canada | 1903 | royalvan.com | Founded as the Vancouver Yacht Club; granted "Royal" prefix in 1906; Jericho Beach clubhouse opened 1927. Graph also carries a duplicate node "Royal Vancouver Yacht Club (RVYC)" — recommend dedup. |
| Royal Perth Yacht Club | Crawley (Perth), WA | Australia | 1841/1865 | rpyc.com.au | (curated Founded cell to the alternate club-history claim from "1876 (per graph; club history cites both 1841 and 1865 origin claims)" — the graph's existing 1876 value naturally wins the conflicts-convention comparison) Fielded Australia II (skipper John Bertrand) in the 1983 America's Cup, ending the New York Yacht Club's 132-year hold — the first successful challenge in Cup history. |
| Cruising Yacht Club of Australia | Rushcutters Bay, Sydney, NSW | Australia | 1944 | cyca.com.au | Organizes the Rolex Sydney Hobart Yacht Race, run annually since 1945. |
| Royal Prince Alfred Yacht Club | Newport (Pittwater), NSW | Australia | 1867 (public meeting Oct 15, 1867; roots trace to "The Mosquito Yacht Club", 1856) | rpayc.com.au | Granted "Royal" prefix by King George V in 1911; relocated from Kirribilli to Pittwater. |
| Royal Geelong Yacht Club | Geelong, VIC | Australia | 1859 | rgyc.com.au | Granted Royal warrant by King George V in 1924; hosts the Festival of Sails, Australia's most popular keelboat regatta. |
| Royal Motor Yacht Club of New South Wales | Point Piper, Sydney, NSW | Australia | 1905 (as Motor Boat Club of NSW) | rmycnsw.com.au | First motorboat club outside the UK granted the "Royal" prefix (King George V, 1927). |
| Manly Yacht Club | Manly, Sydney, NSW | Australia | 1950 | myc.org.au | Formed as the Manly 14ft Skiff Club; clubhouse occupies the site of the former "Gentlemen's Baths" (opened 1892). |
| Sandringham Yacht Club | Sandringham, VIC | Australia | 1912 (as Sandringham Yachting & Angling Club, 1911; renamed 1912) | syc.com.au | Merged with the neighboring Port Phillip Yacht Club in 1932 after a 1931 clubhouse fire. |
| Southport Yacht Club | Main Beach, Gold Coast, QLD | Australia | 1946 | southportyachtclub.com.au | Multiple "Club of the Year" (non-gaming) awards from Clubs Queensland, most recently 2023/2025. |
| Royal Papua Yacht Club | Port Moresby | Papua New Guinea | 1921 (as Port Moresby Aquatic Club) | rpyc.com.pg | Granted Royal charter in 1977; celebrated its centennial in 2021. |
| Royal Suva Yacht Club | Suva | Fiji | 1932 (as Suva Yacht Club) | (not found — active social media only) | Granted the "Royal" title by the Secretary to King George VI in 1950. |
| Fremantle Sailing Club | Fremantle, WA | Australia | 1919 (modern club; predecessor Fremantle Yacht Club dates to 1885, disbanded ~1908) | fremantlesailingclub.com.au | Now one of the largest sailing clubs in WA with 3,000+ members across 11 sections. |
| Claremont Yacht Club | Claremont (Perth), WA | Australia | 1905 (inaugurated Feb 17, 1905; initiated 1903) | claremontyachtclub.org.au | Sits on Freshwater Bay, Swan River, between Fremantle and Perth. |
| Bellerive Yacht Club | Bellerive (Hobart), TAS | Australia | 1926 | byc.org.au | Runs the Banjos Shoreline Crown Series Regatta, one of Tasmania's largest regattas. |
| Cairns Yacht Club | Cairns, QLD | Australia | 1908 (as Cairns Aquatic Club) | cairnsyachtclub.com | Present-day club formed by a 1977 merger of the Tropical Catamaran Club and Cairns Sailing Club. |
| Southwestern Yacht Club | San Diego (Point Loma), CA | USA | 1925 | southwesternyc.org | Founded by Dr. Ernest Chartres-Martin and Stanley Hobson; first met in a shanty at Mancke's pier. |
| California Yacht Club | Marina Del Rey, CA | USA | 1922 | calyachtclub.net | Originally in Wilmington Harbor; moved to Marina del Rey in 1963, own clubhouse from 1966. |
| Corinthian Yacht Club of San Francisco | Tiburon, CA | USA | 1886 | cyc.org | Second-oldest yacht club in Northern California, on its original site since founding; originated the "Opening Day on the Bay" tradition. |
| Coronado Cays Yacht Club | Coronado, CA | USA | 1972 (Formation Day Aug 31, 1972) | ccyc.org | Known locally as "the friendliest yacht club in San Diego." |
| Burrard Yacht Club | North Vancouver, BC | Canada | 1932 (May 5) | burrardyachtclub.com | Grew out of the Vancouver Rowing Club (1899); moved across Burrard Inlet to its current North Vancouver site in 1977. |
| Deep Cove Yacht Club & Sports Club | North Vancouver, BC | Canada | 1936 (July 31, as Deep Cove Sport Association) | deepcoveyc.com | Clubhouse was repurposed for civil-defense use (Ladies' Air Raid Patrol) during WWII. |
| Kelowna Yacht Club | Kelowna, BC | Canada | 1945 | kelownayachtclub.com | Its moorage basin (1,006 slips) is the largest freshwater marina basin in Canada. |
| National Yacht Club | Toronto, ON | Canada | 1894 (as National Yacht and Skiff Club) | thenyc.com | Became a center of hydroplane racing in the late 1920s. |
| Erie Yacht Club | Erie, PA | USA | 1895 | erieyachtclub.org | Its Annette Cup trophy (est. 1907) is one of the oldest continuously-awarded club trophies in the US. |
| Cleveland Yacht Club | Rocky River, OH (per "CYC" city code) | USA | 1904 (per graph) — but club history (via the related "Cleveland Yachting Club" institution) traces to 1878/incorporated 1888; likely the same lineage split across two graph nodes | (see "Cleveland Yachting Club" row) | Discrepancy flagged: multiple published histories date the Cleveland Yacht/Yachting Club lineage to 1878–1888, not 1904. Recommend the ingestion team reconcile the "Cleveland Yacht Club" and "Cleveland Yachting Club" nodes. |
| Cleveland Yachting Club | Rocky River, OH | USA | 1878 (organized as Cleveland Yachting Assn.); incorporated 1888 | cycrr.org | See dedup note above — likely the same club as "Cleveland Yacht Club" node. |
| Coral Ridge Yacht Club | Fort Lauderdale, FL | USA | 1947 | coralridgeyachtclub.com | Founded by Hal E. Wolfe with Coral Ridge Properties' James Hunt and Stephen Calder. |
| Davis Island Yacht Club | Tampa, FL | USA | 1909 (per graph; not independently re-confirmed) | diyc.org | Founding member of the Florida Council of Yacht Clubs; founding year is graph-provenance only. |
| Fort Myers Yacht Club | Fort Myers, FL | USA | 1929 (per graph; unconfirmed) | (not found) | Could not independently verify — modern Fort Myers-area clubs found in searches (St. Charles YC, Fort Myers Beach YC) were founded later (Fort Myers Beach YC in 1953), suggesting this may be a defunct or renamed predecessor club. |
| Charlotte Harbor Yacht Club | Port Charlotte, FL | USA | 1973 | charlotteharboryc.com | (curated Founded cell to the club's own published history from "Graph says 1984; web sources (club's own account) say 1973 (property purchased Sept 1973, groundbreaking 1974)") Discrepancy flagged — recommend using 1973 per the club's own published history. |
| Isles Yacht Club | Punta Gorda, FL | USA | 1976 | islesyc.com | Accepted into the Florida Council of Yacht Clubs the same year it was founded; reached 400 members by 1979. |
| Lauderdale Yacht Club | Fort Lauderdale, FL | USA | 1938 | lyc1938.org | Founding discussion held aboard the schooner Abenaki; original clubhouse destroyed by the 1947 hurricane. |
| Bradenton Yacht Club | Palmetto, FL | USA | 1946 (May 11) | bradentonyachtclub.com | One of the 13 original founding members of the Florida Council of Yacht Clubs. |
| Sarasota Yacht Club | Sarasota, FL | USA | 1926 | sarasotayachtclub.org | Predecessor clubs on Siesta Key/Golden Gate Point date to 1907 and 1913; also one of the Florida Council of Yacht Clubs' 13 founders. |
| Pensacola Yacht Club | Pensacola, FL | USA | 1908 (as Pensacola Yacht & Motor Boat Club); chartered 1910 | pensacolayachtclub.org | Clubhouse was a converted US Army transport ship (General Wilson) from 1922 until it burned in 1925. |
| Tampa Yacht & Country Club | Tampa, FL | USA | 1904 | tampayacht.com | Founded by Tampa's cigar-baron and phosphate-fortune business class; 13-acre site on Hillsborough Bay. |
| Vero Beach Yacht Club | Vero Beach, FL | USA | 1926 [conflict: 1938 per club history book] | verobeachyachtclub.com | (curated Founded cell into the [conflict:] marker format — the graph has NO existing founded value for this club, so the generic existing-value comparison cannot trigger; from "1926 per club's non-profit charter date; a separate club history book dates the modern club to 1938") Two conflicting founding accounts exist in public sources — flagged rather than resolved. |
| Yacht Club of Greece (YCG) | Piraeus (Mikrolimano) | Greece | 1933 (as Yacht Club of Athens; renamed Yacht Club of Greece 1936) | ycg.gr | Carried the title "Royal Yacht Club of Greece" 1940–1973 under royal patronage. |
| Hellenic Offshore Racing Club (HORC) | Piraeus (Mikrolimano) | Greece | 1961 | horc.gr | (curated Founded cell to the web-sourced alternate from "1961 (web sources; graph lists 1964, which likely refers to its Aegean Rally, running since 1964)") Discrepancy flagged. Runs a Sailing Academy since 1969 with 25,000+ graduates. |
| Nautical Club of Vouliagmeni (NOV) | Vouliagmeni | Greece | 1937 (Feb 23) | nov.gr | Multi-sport club (sailing, swimming, water polo, water-skiing) alongside its marina. |
| Enoshima Yacht Club | Enoshima, Fujisawa, Kanagawa | Japan | 1964 | eyc.jp | Founded as the host club for the 1964 Tokyo Olympics sailing competition; Enoshima also hosted sailing for the 2020(2021) Tokyo Olympics. |
| Tokyo Yacht Club | Tokyo (Yumenoshima) | Japan | (not confirmed) | tyc.gr.jp | Operates Yumenoshima Marina (650 berths); Japan's oldest yacht club is reportedly the separate Yokohama Yacht Club (1886, yyc.or.jp), not this one. |
| Kansai Yacht Club | Nishinomiya, Hyogo | Japan | ~1964 (unconfirmed; inferred from club's own "kyc1964" branding) | kyc.or.jp | Already had website in graph; founding year could not be independently confirmed beyond the club's own social-media branding. |
| Neva Yacht Club | St. Petersburg | Russia | 1958 (re-established); lineage traces to 1718 "Nevsky Flot" founded by Peter the Great | (not found) | Claims (disputed by Royal Cork Yacht Club, Ireland, 1720) to be the world's oldest yacht-club lineage. |
| Yacht Club Argentino | Buenos Aires | Argentina | 1883 (July 2) | yca.org.ar | Founding member of the International Yacht Racing Union (now World Sailing), 1909. |
| Yacht Club de Chile | Viña del Mar (Caleta Higuerillas) | Chile | 1941 (Sept 26) | yachtclubdechile.cl | — |
| Iate Clube do Rio de Janeiro (ICRJ) | Rio de Janeiro (Urca) | Brazil | 1920 (March 25, as Fluminense Yacht Club, a nautical branch of Fluminense FC) | icrj.com.br | Celebrated its centennial in 2020. |
| Veleiros do Sul | Porto Alegre | Brazil | 1934 (Dec 13) | vds.com.br | First sailing club in Porto Alegre; introduced the Sharpie 12m² class to southern Brazil. |
| Club de Regatas Lima | Chorrillos, Lima | Peru | 1875 (April 26) | crl.pe | Biggest multi-sport club in Peru; founded as a rowing club. |
| Yacht Club Uruguayo | Montevideo | Uruguay | 1906 | ycu.org.uy | Its 1939 boat-shaped clubhouse tower (architects Herrán & Crespi) is a declared national historic monument. |
| Republic of Singapore Yacht Club (RSYC) | West Coast, Singapore | Singapore | 1826 (Feb 7) | rsyc.org.sg | Oldest yacht club in Asia; known as Royal Singapore Yacht Club 1924–1967. |
| Changi Sailing Club | Changi, Singapore | Singapore | 1936 (as Changi Garrison Yacht Club, founded by British Royal Engineers) | csc.org.sg | Notable alumni sailor: Olympian Benedict Tan. |
| Shanghai Yacht Club & Resort | Shanghai | China | ~1868–1871 (colonial-era Shanghai Yacht Club on the Bund; unclear institutional continuity with the present-day graph entry) | (not found) | Historic club was a racially-exclusive Western colonial institution; cannot confirm continuity to the present "Shanghai Yacht Club & Resort" node — flagged rather than merged. |

## Sources

See research/round4/club-enrichment.md's own Sources section for the full per-club citation list (club own-site history pages, Wikipedia, and regional yachting-body sources).
