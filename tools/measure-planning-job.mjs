import { build } from 'esbuild';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const fixture = resolve(process.argv[2] ?? 'docs/evidence/planning-job-read-fixture.json');
const result = await build({ stdin: { resolveDir: process.cwd(), contents: `
import { readFileSync } from 'node:fs';
import { createMemoryPort } from './src/adapters/screeps/memory';
import { createPlanningJobStore } from './src/features/planning/planning-job-store';
const envelope = JSON.parse(readFileSync(${JSON.stringify(fixture)}, 'utf8'));
const root = { eldrift: { format: 1, records: { 'planning-jobs/W0N1': envelope } } };
const types = ['spawn','extension','road','constructedWall','rampart','link','storage','tower','observer','powerSpawn','extractor','lab','terminal','container','nuker','factory'];
const store = createPlanningJobStore(createMemoryPort(() => root), 'W0N1', types);
const initial = store.read();
const milliseconds = [];
for (let index = 0; index < 60; index++) {
  const began = performance.now();
  const value = store.read();
  if (value.checkpoint?.next !== initial.checkpoint?.next) throw new Error('Changed cursor');
  if (index >= 10) milliseconds.push(performance.now() - began);
}
milliseconds.sort((a,b) => a-b);
export default { node: process.version, next: initial.checkpoint?.next,
  retainedEntries: initial.checkpoint?.best?.entries.length, warmups: 10, samples: milliseconds.length,
  median: milliseconds[25], p95: milliseconds[47], mean: milliseconds.reduce((a,b) => a+b)/milliseconds.length };
` }, bundle: true, platform: 'node', format: 'esm', write: false });
const module = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
console.log(JSON.stringify({ ...module.default, fixture,
  fixtureSha256: createHash('sha256').update(readFileSync(fixture)).digest('hex') }, null, 2));
