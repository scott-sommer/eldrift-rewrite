const assert = require('node:assert/strict');
const { verifyStampInventory } = require('./stamp-room.cjs');
function verifyStampBudget(memory, lateReset = false) {
  const records = memory.eldrift.records, job = records['planning-jobs/W0N1'].data;
  const raw = job.checkpoint?.pending?.checkpoint;
  const pending = raw?.version === 2 ? { ...raw, ...JSON.parse(raw.payload) } : raw;
  console.log('STAMP_BUDGET_TRACE ' + JSON.stringify(memory.stampBudgetRows.filter(row => row.tick % 50 === 0)));
  console.log('STAMP_BUDGET ' + JSON.stringify({ receipt: job.receipt && {
    outcome: job.receipt.outcome, completedAt: job.receipt.completedAt, diagnostics: job.receipt.diagnostics },
    next: job.checkpoint?.next, phase: pending?.phase,
    attempts: pending?.checkpoint?.composition?.totalAttempts,
    depth: pending?.checkpoint?.composition?.choices?.length,
    roads: pending?.checkpoint?.roads?.connections?.length,
    hauling: pending?.checkpoint?.hauling?.routes?.length, service: pending?.checkpoint?.service?.routes?.length }));
  assert.equal(job.receipt?.outcome, 'committed', 'default allowances must eventually commit the stamp plan');
  const plan = records['planning/W0N1'].data;
  assert.equal(plan.revision, 1);
  assert.equal(plan.strategy, 'stamps');
  verifyStampInventory(plan);
  assert.ok(job.receipt.completedAt < 1600);
  assert.equal(job.receipt.diagnostics.evaluated, 36);
  assert.equal(job.receipt.diagnostics.rejected, 35);
  assert.deepEqual(memory.stampReloads, [6, 101, ...(lateReset ? memory.stampLateResets.map(item => item.tick) : [])]);
  assert.ok(memory.planningRoomRows.every(row => row.sites === 0));
}
function captureStampBudget(memory) {
  return { plan: memory.eldrift.records['planning/W0N1'].data,
    receipt: memory.eldrift.records['planning-jobs/W0N1'].data.receipt,
    reloads: memory.stampReloads, resets: memory.stampLateResets ?? [],
    trace: memory.stampBudgetRows.filter(row => row.tick % 50 === 0) };
}
function compareStampBudgetPlans(baseline, resumed) {
  assert.deepEqual(canonicalPlan(resumed.plan), canonicalPlan(baseline.plan),
    'late reloads must preserve geometry, object associations, metadata and scores');
}
function canonicalPlan(plan) {
  const { generatedAt, committedAt, observation, ...provenance } = plan.provenance;
  const snapshot = JSON.parse(observation);
  assert.equal(snapshot[0], 1, 'comparison understands assessment fingerprint version1');
  const objects = [...snapshot[3], ...snapshot[4]].map(value => JSON.parse(value));
  const identities = new Map(objects.map(([id, kind, x, y]) => [id, kind + ':' + x + ':' + y]));
  // Mock servers allocate different IDs per run. Preserve every association by physical object identity.
  const entries = plan.entries.map(entry => entry.objectId
    ? { ...entry, objectId: identities.get(entry.objectId) ?? entry.objectId } : entry);
  for (const index of [3, 4, 5]) {
    snapshot[index] = snapshot[index].map(value => JSON.stringify(JSON.parse(value).slice(1))).sort();
  }
  return { ...plan, entries, provenance: { ...provenance, observation: JSON.stringify(snapshot) } };
}
module.exports = { verifyStampBudget, captureStampBudget, compareStampBudgetPlans };
