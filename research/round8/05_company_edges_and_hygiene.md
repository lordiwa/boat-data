# Round 8 — Lane C: company edge coverage + website-attr hygiene

Author: orchestrator (local graph analysis, no web budget spent)
Baseline: graph.json @ 4,278 nodes / 3,107 edges; company 61.01% attrs / **35.93% edges**, weight 10.

## Finding 1 — the company edge gap is NOT an edge-wiring problem

| | count |
|---|---|
| company nodes | 796 |
| with >= 1 edge | 286 |
| **isolated (0 edges)** | **510** |
| of those isolated, named as a bare domain string | **365** |
| domain-named company nodes that have ANY edge | **0** |

Every relationship a company currently participates in is one of four kinds:
`operated_by` (199 in), `owned_by` (117 in), `based_in` (42 out), `made_by` (1 in).

The 365 domain-named nodes (`a-yachts.com`, `abberley.com`, `apolloduck.asia`, …) are
brokers/chandlers/charter agents ingested from a directory-style corpus doc where the
**website column was used as the entity name**. They are 46% of the company type and
carry 0 edges between them.

**Conclusion: this gap is not closable by wiring edges.** There is no grounded relationship
to assert between `abberley.com` and anything else in the graph — inventing `based_in` or
`operated_by` edges for them would be exactly the fabrication the never-guess rule forbids.
Raising company edge% by connecting these nodes would be **metric gaming, not enrichment**.

This satisfies TASK-026 AC 4's alternative branch: a written finding explaining why the
remaining gap is not closable without inventing relationships.

### What IS legitimately actionable here
19 stem collisions exist where a properly-named company coexists with its own domain twin:

```
Burgess Yachts        | burgessyachts.com
Fraser Yachts         | FraserYachts.com
Camper and Nicholsons | camperandnicholsons.com
Moran Yachts          | moranyachts.com
Ocean Independence    | oceanindependence.com
Dream Yacht Charter   | dreamyachtcharter.com
Boatbookings          | boatbookings.com | boatbookings.sg
YACHTZOO              | yacht-zoo.com | yachtzoo.com
...16 pairs total
```

These are **merge candidates, not confirmed merges**. I attempted to auto-ground them by
testing whether the real-named node's `website` attr equals its domain twin's name.
**0 of 16 could be grounded that way** — see Finding 2 for why. They must go to a researcher
for citation before any merge, per the ungrounded-merges-stay-split rule.

Note `boatbookings.com` vs `boatbookings.sg` and `apolloduck.asia` vs `Apolloduck.com` are
regional sites of one brand — plausible but **not** self-evidently the same legal entity.
Do not merge on stem similarity alone.

## Finding 2 — the `website` attribute is polluted graph-wide (20.5%)

198 of 965 website attrs are not bare domains:

| defect | count | example |
|---|---|---|
| markdown link | 129 | `[www.ayc.ca](http://www.ayc.ca/)` |
| URL path | 24 | `aci-marinas.com/marina/aci-dubrovnik` |
| `http(s)://` scheme | 21 | `https://eyc.jp/` |
| parenthetical prose | 19 | `— (site defunct)` |
| **email address** | 3 | `info@abys-yachting.com`, `marie@yacht-zoo.com` |
| two domains in one cell | 2 | `marinaibiza.com / marinaportibiza.com` |

The email cases are why Finding 1's auto-grounding returned 0: `ABYS Yachting`'s "website"
is a contact email, so it can never equal `abysyachting.com`.

## Finding 3 — absence sentinels are stored as present values, inflating the score

~27 attrs record *failure to find* as a **value** instead of as absence:

```
yacht.class_society  8   "n/a (not found)"
yacht.imo            7   "n/a (not found)"
club.website         4   "(not found)"
marina.website       3   "— (state-run, no single official site found)"
yacht.flag           3   "n/a (not found)"
builder.website      2   "— (site defunct)"
```

The completeness scorer counts a non-empty string as present, so **every one of these is
counted as coverage the graph does not actually have**. This runs against the project's
own never-guess rule (empty beats invented) and biases the honest metric *upward*.

Impact is small in absolute terms (~27 of ~7,000 scored cells, well under 0.05 of a point)
but the direction matters for a project whose selling point is an honest metric.

NOT in this category — leave alone: `builder.status` / `engine.status` values like
`defunct (wound down April 2016)`. "Defunct" is a real status, not a failure to find.

## Recommended split
- **In TASK-026**: normalize `website` to a bare domain at the mapper boundary (strip scheme /
  markdown / trailing path, reject emails), and null out the ~27 absence sentinels so they
  stop counting as coverage. Both are hygiene, both need pinned tests.
- **Separate ticket**: the 16 company merge pairs — each needs a cited source, and merges are
  irreversible. Do not bundle into a data round.
- **Explicitly NOT doing**: wiring edges to the 365 domain-named broker nodes.

## Caveat on the metric
Fixing Finding 3 will make the score go **down** slightly. That is correct behaviour — it is a
re-baseline, not a regression. Per loop process rule 5 it must land as its own labeled
commit, never folded into the enrichment diff, so the two effects stay separable.
