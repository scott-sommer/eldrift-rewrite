import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
mkdirSync('artifacts', { recursive: true });
await build({ entryPoints: ['src/capabilities/planning/terrain-cut-defense.ts'],
  outfile: 'artifacts/defense-cut-benchmark.cjs', bundle: true, platform: 'node', format: 'cjs' });
const { createTerrainCutDefense } = createRequire(import.meta.url)('../artifacts/defense-cut-benchmark.cjs');
const terrain = Array(2500).fill('plain'), protectedTiles = [];
for (let y = 20; y <= 30; y++) for (let x = 20; x <= 30; x++) protectedTiles.push({ x, y });
const input = { observation: { terrain, objects: [], infrastructure: [], constraints: [] },
  protectedAssets: [{ type: 'storage', position: { x: 25, y: 25 } }],
  protectedTiles, rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
const started = performance.now(), network = createTerrainCutDefense(input);
const setupMilliseconds = performance.now() - started, slices = [];
let result;
for (let call = 0; call < 100000; call++) {
  const began = performance.now();
  result = network.advance(1, () => true, 1000);
  slices.push(performance.now() - began);
  if (result.status !== 'pending') break;
}
if (result.status !== 'complete') throw new Error('Open-room cut did not complete');
const report = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runtime: process.version, platform: process.platform, environment: 'local Node; not Screeps game CPU',
  fixture: 'open50x50 room, protected11x11 interior, all border entries',
  budget: { augmentations: 1, scans: 1000 }, setupMilliseconds, calls: slices.length,
  searchMilliseconds: slices.reduce((sum, value) => sum + value, 0),
  maximumSliceMilliseconds: Math.max(...slices), barriers: result.barriers.length,
  validation: result.validation, slices };
writeFileSync('artifacts/defense-cut-measurement.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, slices: undefined }));

