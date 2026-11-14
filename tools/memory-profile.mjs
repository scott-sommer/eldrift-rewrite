import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
fs.mkdirSync('artifacts', { recursive: true });
const output = path.resolve('artifacts/memory-profile-fixture.mjs');
await build({ entryPoints: ['test/fixtures/memory/state.ts'], outfile: output, bundle: true, format: 'esm', platform: 'node', target: 'node24' });
const { memoryFixture, measureSerialization } = await import(pathToFileURL(output).href);
const cases = [];
for (const rooms of [1, 5, 20]) {
  const memory = memoryFixture(rooms);
  const before = JSON.stringify(memory);
  const samples = Array.from({ length: 11 }, () => measureSerialization(memory, () => performance.now()));
  assert.equal(JSON.stringify(memory), before);
  assert.ok(samples.every(sample => sample.codeUnits === before.length && sample.utf8Bytes === Buffer.byteLength(before)));
  const warm = samples.slice(1).map(sample => sample.elapsed).sort((a, b) => a - b);
  const namespaces = {};
  for (const [key, envelope] of Object.entries(memory.eldrift.records)) {
    const owner = key.split('/')[0];
    namespaces[owner] ??= { records: 0, envelopeBytes: 0 };
    namespaces[owner].records++;
    namespaces[owner].envelopeBytes += Buffer.byteLength(JSON.stringify(envelope));
  }
  cases.push({ rooms, creeps: rooms * 20, tasks: rooms * 60, planEntries: rooms * 150, claims: rooms * 20,
    codeUnits: before.length, utf8Bytes: Buffer.byteLength(before), coldMilliseconds: samples[0].elapsed,
    warmMedianMilliseconds: (warm[4] + warm[5]) / 2, warmMaximumMilliseconds: warm.at(-1), namespaces, samples });
}
const report = { kind: 'synthetic-schema-capacity', node: process.version, platform: process.platform,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  dirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  fixtureBundleSha256: createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
  timingScope: 'Host wall time: plain-data validation, JSON copy and final stringify; excludes fixture construction and UTF-8 counting. Not engine Memory serialization CPU.',
  namespaceScope: 'Envelope values only; full totals additionally include record keys and root framing.', cases };
fs.writeFileSync('artifacts/memory-profile.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(cases.map(({ rooms, utf8Bytes, warmMedianMilliseconds, warmMaximumMilliseconds }) => ({ rooms, utf8Bytes, warmMedianMilliseconds, warmMaximumMilliseconds })), null, 2));
