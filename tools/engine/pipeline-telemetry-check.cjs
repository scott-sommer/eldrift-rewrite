const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const { createPipelineTelemetry } = require('./pipeline-telemetry.cjs');
const { verifyPipelineCalibration } = require('./remote-pipeline-calibration.cjs');
function memory(tick) {
  return { pipelineConfiguredMode: true,pipelineRows: [{ tick,income: tick }],
    pipelineCalibration: { quote: { observedAt: 1 },input: { protected: true },result: { fixed: true },horizon: 10,
      frames: [{ tick,position: [1,2] }],events: [{ tick,action: 'harvest',amount: 8 }] },
    eldrift: { records: { 'owned/state': { owner: 'fixture',data: { protected: true } } } },
    pipelineRemote: { amounts: { receipt: 8 } },pipelineBirths: { actual: { seenAt: 1 } },flags: { real: true } };
}
test('between-tick collection preserves all non-history state and reconstructs across serialized resets',async () => {
  const collector = createPipelineTelemetry(2), first = memory(1), baseline = structuredClone(first);
  let stored = JSON.stringify(first);
  const bot = { id: 'bot',get memory() { return Promise.resolve(stored); } };
  const server = { common: { storage: { env: { keys: { MEMORY: 'memory:' },set: async (key,value) => {
    assert.equal(key,'memory:bot'); stored = value;
  } } } } };
  await collector.capture(server,bot,1);
  const reduced = JSON.parse(stored), expected = structuredClone(baseline);
  expected.pipelineRows = []; expected.pipelineCalibration.frames = []; expected.pipelineCalibration.events = [];
  assert.deepEqual(reduced,expected);
  const second = memory(2); stored = JSON.stringify(second); await collector.capture(server,bot,2);
  const final = JSON.parse(stored); collector.restore(final);
  assert.deepEqual(final.pipelineRows,[...baseline.pipelineRows,...second.pipelineRows]);
  assert.deepEqual(final.pipelineCalibration.events,[...baseline.pipelineCalibration.events,...second.pipelineCalibration.events]);
  assert.equal(collector.report().counts.frames,2); assert.equal(collector.report().metrics.length,2);
});
test('missing ticks, duplicate rows, changed proofs and capacity overflow refuse without draining',() => {
  const c = createPipelineTelemetry(2), first = memory(1); c.drain(first,1);
  assert.throws(() => c.drain(memory(1),1),/gap or duplicate/);
  assert.throws(() => c.drain(memory(3),3),/gap or duplicate/);
  const changed = memory(2); changed.pipelineCalibration.result.fixed = false;
  const before = structuredClone(changed); assert.throws(() => c.drain(changed,2),/proof changed/); assert.deepEqual(changed,before);
  const duplicate = memory(2); duplicate.pipelineRows.push({ tick: 2 });
  assert.throws(() => c.drain(duplicate,2),/bounded array/);
  const gap = memory(2); gap.pipelineRows = []; assert.throws(() => c.drain(gap,2),/Every completed tick/);
  c.drain(memory(2),2); assert.throws(() => c.drain(memory(3),3),/limit exceeded/);
});
test('archived actual campaign reconstructs every observation and passes the unchanged exact verifier',() => {
  const archive = path.resolve(__dirname,'../../docs/evidence/startup-identical-booking-configured.json.gz');
  const actual = JSON.parse(gunzipSync(fs.readFileSync(archive))), proof = actual.pipelineCalibration.proof;
  const collector = createPipelineTelemetry(1000), live = { pipelineConfiguredMode: true,pipelineRows: [],
    pipelineCalibration: { ...proof,frames: [],events: [] },pipelineBirths: actual.pipelineConfigured.births };
  const frames = new Map(proof.frames.map(frame => [frame.tick,frame])), events = new Map();
  for (const event of proof.events) { if (!events.has(event.tick)) events.set(event.tick,[]); events.get(event.tick).push(event); }
  for (const row of actual.pipelineConfigured.rows) {
    live.pipelineRows = [row]; live.pipelineCalibration.frames = frames.has(row.tick) ? [frames.get(row.tick)] : [];
    live.pipelineCalibration.events = events.get(row.tick) ?? []; collector.drain(live,row.tick);
  }
  collector.restore(live);
  assert.deepEqual(live.pipelineRows,actual.pipelineConfigured.rows);
  assert.deepEqual(live.pipelineCalibration.frames,proof.frames); assert.deepEqual(live.pipelineCalibration.events,proof.events);
  verifyPipelineCalibration(live,{ errors: [],messages: [] });
  const corrupt = structuredClone(live); corrupt.pipelineRows.find(row => row.income > 0).income++;
  assert.throws(() => verifyPipelineCalibration(corrupt,{ errors: [],messages: [] }),/Every settled receipt/);
});

test('failed collection preserves the uncollected row and never writes altered decision state',async () => {
  const collector = createPipelineTelemetry(), live = memory(2), set = () => { throw new Error('Must not write'); };
  const server = { common: { storage: { env: { keys: { MEMORY: 'memory:' },set } } } };
  await assert.rejects(collector.capture(server,{ id: 'bot',memory: Promise.resolve(JSON.stringify(live)) },2),/gap or duplicate/);
  assert.deepEqual(collector.report().failedCapture.memory,live);
  assert.equal(collector.report().ticks,0);
});
