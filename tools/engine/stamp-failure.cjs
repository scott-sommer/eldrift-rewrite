const assert = require('node:assert/strict');
function verifyStampFailure(memory) {
  const records = memory.eldrift.records, receipt = records['planning-jobs/W0N1'].data.receipt;
  assert.ok(memory.retainedStampPlan, 'capture a naturally committed plan before changing search policy');
  assert.deepEqual(records['planning/W0N1'], JSON.parse(memory.retainedStampPlan));
  assert.equal(records['planning/W0N1'].data.revision, 1);
  assert.equal(records['planning/W0N1'].data.strategy, 'stamps');
  assert.equal(receipt.outcome, 'no-valid-candidate');
  assert.ok(receipt.completedAt >= 100 && receipt.completedAt < 110);
  assert.match(receipt.diagnostics.lastRejection.reason, /search-limit/);
  assert.ok(receipt.diagnostics.rejected >= 1);
  assert.deepEqual(memory.stampReloads, [21, 101]);
  const rows = memory.planningRoomRows;
  assert.ok(rows.some(row => row.tick < 100 && row.outcome === 'committed'));
  assert.ok(rows.filter(row => row.tick >= 100).every(row => row.revision === 1));
  assert.ok(rows.slice(-10).every(row => row.outcome === 'no-valid-candidate'));
  assert.ok(rows.every(row => row.sites === 0));
  console.log('STAMP_FAILURE_RETAINED ' + JSON.stringify({ completedAt: receipt.completedAt, diagnostics: receipt.diagnostics }));
}
module.exports = { verifyStampFailure };
