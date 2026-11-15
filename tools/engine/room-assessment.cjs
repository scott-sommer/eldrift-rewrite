const assert = require('node:assert/strict');
function verifyRoomAssessment(memory) {
  const rows = memory.assessmentRows;
  assert.equal(rows.length, 3);
  assert.ok(rows.every(row => row.roadWalkable && !row.roadAvailable && row.hiddenAbsent));
  assert.ok(rows.every(row => row.sourceCount > 0 && row.controllerCount === 1 && row.anchorCount > 0 && row.siteCount > 0));
  assert.ok(rows.every(row => row.fingerprint === rows[0].fingerprint));
  assert.deepEqual(rows.map(row => row.tick), [1, 2, 3]);
  assert.ok(rows.every(row => JSON.stringify(row.sites) === JSON.stringify(rows[0].sites)), 'observation does not construct');
}
module.exports = { verifyRoomAssessment };
