// ingest/scripts/geoCoverage.mjs
//
// TASK-027: measures geographic-hierarchy coverage on an exported graph.json
// (AC4). Usage:  node scripts/geoCoverage.mjs [path/to/graph.json]
// Exports computeCoverage(graph) so tests assert on the same numbers.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.resolve(__dirname, '..', 'data', 'graph.json');

const pct = (n, d) => (d === 0 ? 100 : Math.round((n / d) * 1000) / 10);

export function computeCoverage(graph) {
  const inbound = new Map();
  for (const e of graph.edges) {
    if ((e.rel === 'located_in' || e.rel === 'based_in') && e.dst.startsWith('region:')) {
      inbound.set(e.dst, (inbound.get(e.dst) || 0) + 1);
    }
  }
  const regions = graph.nodes.filter((n) => n.type === 'region');
  const resolved = (n) => n.attrs.level && n.attrs.level !== 'unresolved';
  const heavy = regions.filter((n) => (inbound.get(n.id) || 0) >= 3);
  const cityOrUnresolved = regions.filter((n) => n.attrs.level === 'city' || n.attrs.level === 'unresolved');
  const hasGeo = (n) => !!(n.attrs.geo && n.attrs.geo.country_code);
  const ofType = (t) => graph.nodes.filter((n) => n.type === t);
  const share = (nodes) => ({ with_geo: nodes.filter(hasGeo).length, total: nodes.length, pct: pct(nodes.filter(hasGeo).length, nodes.length) });
  const located = new Set(graph.edges.filter((e) => e.rel === 'located_in' || e.rel === 'based_in').map((e) => e.src));
  // Amended AC4: marinas/clubs are measured over nodes that HAVE a located_in/based_in edge;
  // the absolute figure (all nodes) is kept as informational `pct_of_all`.
  const shareLocated = (nodes) => {
    const l = nodes.filter((n) => located.has(n.id));
    return { ...share(l), pct_of_all: share(nodes).pct, all_total: nodes.length };
  };
  const builders = ofType('builder').filter((n) => n.attrs.country);

  return {
    regions_ge3_inbound: {
      resolved: heavy.filter(resolved).length,
      total: heavy.length,
      pct: pct(heavy.filter(resolved).length, heavy.length),
      unresolved: heavy.filter((n) => !resolved(n)).map((n) => ({ id: n.id, inbound: inbound.get(n.id) })),
    },
    regions_all: { resolved: regions.filter(resolved).length, total: regions.length, pct: pct(regions.filter(resolved).length, regions.length) },
    regions_city_level_only: {
      resolved: cityOrUnresolved.filter(resolved).length,
      total: cityOrUnresolved.length,
      pct: pct(cityOrUnresolved.filter(resolved).length, cityOrUnresolved.length),
    },
    marinas: shareLocated(ofType('marina')),
    clubs: shareLocated(ofType('club')),
    shipyards: share(ofType('shipyard')),
    builders_with_country: share(builders),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const file = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PATH;
  console.log(JSON.stringify(computeCoverage(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2));
}
