const assert = require('node:assert/strict');
function verifyConstructionRetry(memory) {
  const rows = memory.constructionRetryRows, calls = memory.constructionRetryCalls;
  console.log('CONSTRUCTION_RETRY_TRACE ' + JSON.stringify({ calls, rows }));
  assert.equal(rows.length, 12);
  assert.deepEqual(memory.stampReloads, [5]);
  assert.deepEqual(calls.map(row => row.tick), [1, 3, 7, 10]);
  assert.ok(calls.slice(0, 3).every(row => row.status === 'retry' && row.reason === 'engine:-7'));
  assert.equal(calls[3].status, 'created');
  assert.ok(rows.filter(row => row.tick >= 7 && row.tick < 10).every(row => row.retries['road:25:25'].quarantined));
  assert.ok(rows.filter(row => row.tick >= 10).every(row => Object.keys(row.retries).length === 0));
  assert.ok(rows.filter(row => row.tick < 11).every(row => row.sites === 0));
  assert.equal(rows.at(-1).sites, 1);
  console.log('CONSTRUCTION_RETRY ' + JSON.stringify({ reset: memory.stampReloads, calls, final: rows.at(-1) }));
}
module.exports = { verifyConstructionRetry };
