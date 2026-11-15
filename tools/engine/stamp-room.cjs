const assert = require('node:assert/strict');
function verifyStampRoom(memory, automatic = false) {
  const rows = memory.planningRoomRows;
  assert.equal(rows.length, 400);
  assert.deepEqual(memory.stampReloads, automatic ? [21, 101, 201] : [6, 101]);
  assert.ok(rows.some(row => row.tick < (automatic ? 21 : 6) && row.pending));
  console.log('STAMP_ROOM_PROGRESS ' + JSON.stringify(rows.slice(-3)));
  const records = memory.eldrift.records;
  const plan = records['planning/W0N1'].data;
  const job = records['planning-jobs/W0N1'].data;
  console.log('STAMP_ROOM_JOB ' + JSON.stringify({ outcome: job.receipt?.outcome, completedAt: job.receipt?.completedAt, diagnostics: job.receipt?.diagnostics }));
  assert.equal(job.receipt?.outcome, 'committed');
  if (!automatic) assert.equal(plan.strategy, 'stamps');
  if (automatic) {
    const ids = records['planning-candidates/W0N1'].data.checkpoint.candidates;
    for (const strategy of ['standard', 'constrained', 'stamps']) assert.ok(ids.some(id => id.startsWith(strategy + ':')));
    assert.equal(job.receipt.diagnostics.evaluated, ids.length);
    assert.ok(rows.some(row => row.pending?.startsWith('stamps:')));
  }
  assert.equal(plan.revision, 1);
  assert.ok(job.receipt.completedAt > (automatic ? 21 : 6) && job.receipt.completedAt < (automatic ? 200 : 100));
  if (!automatic) assert.equal(job.receipt.diagnostics.rejected, 0);
  for (const [type, count] of Object.entries({ spawn: 3, tower: 6, link: 6,
    storage: 1, terminal: 1, factory: 1, observer: 1, nuker: 1, powerSpawn: 1, extractor: 1 })) {
    assert.equal(plan.entries.filter(entry => entry.type === type).length, count, type);
  }
  assert.ok(plan.entries.some(entry => entry.type === 'rampart'));
  assert.ok(plan.entries.some(entry => entry.type === 'spawn' && entry.x === 22 && entry.y === 24));
  assert.ok(plan.entries.some(entry => entry.type === 'storage' && entry.x === 25 && entry.y === 25));
  assert.equal(plan.entries.filter(entry => entry.type === 'extension').length, 60);
  assert.equal(plan.entries.filter(entry => entry.type === 'lab').length, 10);
  assert.ok(rows.every(row => row.sites === 0));
  assert.ok(rows.slice(-10).every(row => row.outcome === 'committed' && row.revision === 1));
  console.log('STAMP_ROOM_COMMIT ' + JSON.stringify({ committedAt: plan.provenance.committedAt, costs: plan.provenance.costs, bootstrap: plan.provenance.bootstrap }));
}
module.exports = { verifyStampRoom };
