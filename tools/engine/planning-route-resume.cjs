const assert = require('node:assert/strict');
function verifyPlanningRouteResume(memory) {
  assert.deepEqual(memory.routeBatchRows, [
    { tick: 1, done: false, searches: 1, completed: 1 },
    { tick: 2, done: true, searches: 1, completed: 2, total: 20 },
    { tick: 3, done: true, searches: 0, completed: 2, total: 20 },
  ]);
}
module.exports = { verifyPlanningRouteResume };
