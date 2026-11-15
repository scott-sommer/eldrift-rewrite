const assert = require('node:assert/strict');
function verifyStampBudget(memory) {
  const records = memory.eldrift.records, job = records['planning-jobs/W0N1'].data;
  const pending = job.checkpoint?.pending?.checkpoint;
  console.log('STAMP_BUDGET_TRACE ' + JSON.stringify(memory.stampBudgetRows.filter(row => row.tick % 50 === 0)));
  console.log('STAMP_BUDGET ' + JSON.stringify({ receipt: job.receipt && {
    outcome: job.receipt.outcome, completedAt: job.receipt.completedAt, diagnostics: job.receipt.diagnostics },
    next: job.checkpoint?.next, phase: pending?.phase,
    attempts: pending?.checkpoint?.composition?.totalAttempts,
    depth: pending?.checkpoint?.composition?.choices?.length,
    roads: pending?.checkpoint?.roads?.connections?.length }));
  assert.equal(job.receipt?.outcome, 'committed', 'default allowances must eventually commit the stamp plan');
  assert.equal(records['planning/W0N1'].data.revision, 1);
  assert.deepEqual(memory.stampReloads, [6, 101]);
  assert.ok(memory.planningRoomRows.every(row => row.sites === 0));
}
module.exports = { verifyStampBudget };
