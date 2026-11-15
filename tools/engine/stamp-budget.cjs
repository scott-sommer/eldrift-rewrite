const assert = require('node:assert/strict');
const { verifyStampInventory } = require('./stamp-room.cjs');
function verifyStampBudget(memory) {
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
  assert.deepEqual(memory.stampReloads, [6, 101]);
  assert.ok(memory.planningRoomRows.every(row => row.sites === 0));
}
module.exports = { verifyStampBudget };
