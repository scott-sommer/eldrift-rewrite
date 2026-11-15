const assert = require('node:assert/strict');
function verifyPlanningBudget(memory) {
  const rows = memory.planningBudgetRows;
  assert.equal(rows.length, 80);
  console.log('PLANNING_BUDGET ' + JSON.stringify({ first: rows.slice(0, 5), last: rows.slice(-5),
    maxUsed: Math.max(...rows.map(row => row.used)), meanUsed: rows.reduce((sum, row) => sum + row.used, 0) / rows.length }));
  assert.ok(rows.at(-1).candidates > 1000, 'default CPU allowance must finish the full native candidate set');
  assert.ok(rows.some(row => row.jobRevision > 0), 'default CPU allowance must reach scoring');
  assert.ok(rows.some(row => row.next > 0 || row.pending || row.outcome), 'default CPU allowance must advance evaluation');
}
module.exports = { verifyPlanningBudget };
