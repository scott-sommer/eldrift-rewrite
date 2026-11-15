const assert = require('node:assert/strict');
function verifyPlanningRuntime(memory) {
  const rows = memory.planningRuntimeRows;
  assert.deepEqual(rows.map(row => row.tick), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(rows.map(row => row.initialized), [false, false, true, true, true, true, true, true]);
  assert.deepEqual(rows.map(row => row.candidates), [0, 0, 1, 2, 3, 4, 4, 4]);
  assert.deepEqual(rows.map(row => row.revision), [0, 0, 1, 2, 3, 4, 4, 4]);
  assert.equal(memory.eldrift.records['planning/W0N1'].data.revision, 0);
  assert.equal(memory.eldrift.records['planning-requests/W0N1'].data.revision, 1);
  assert.equal(memory.eldrift.records['planning-jobs/W0N1'].data.checkpoint, undefined);
}
module.exports = { verifyPlanningRuntime };
