const assert = require('node:assert/strict');
async function changeAssessmentSites(server, tick) {
  if (tick !== 3) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'constructionSite' });
}
function verifyRoomAssessment(memory) {
  const admitted = memory.planningAdmissionRows;
  assert.equal(admitted.length, 8);
  assert.deepEqual(admitted.map(row => row.revision), [1, 1, 1, 2, 2, 3, 3, 4]);
  assert.deepEqual(admitted.map(row => row.reused), [false, true, true, false, true, false, true, false]);
  assert.equal(admitted[0].reused, false);
  assert.ok(admitted.some(row => row.reused));
  assert.ok(admitted.every(row => row.baseRevision === 0));
  assert.equal(memory.eldrift.records['planning-requests/E9S9'], undefined);
  const rows = memory.assessmentRows;
  assert.equal(rows.length, 8);
  assert.ok(rows.every(row => row.roadWalkable && !row.roadAvailable && row.hiddenAbsent && row.inputRoundTrip));
  assert.ok(rows.every(row => row.sourceCount > 0 && row.controllerCount === 1 && row.anchorCount > 0));
  assert.deepEqual(rows.map(row => row.tick), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(rows.slice(0, 3).every(row => row.fingerprint === rows[0].fingerprint && row.siteCount > 0));
  assert.ok(rows.slice(0, 3).every(row => JSON.stringify(row.sites) === JSON.stringify(rows[0].sites)));
  assert.ok(rows.slice(3).every(row => row.sites.length === 0), 'observer does not recreate removed sites');
  assert.notEqual(rows[3].fingerprint, rows[0].fingerprint, 'site removal invalidates assessment');
  assert.equal(rows[3].fingerprint, rows[4].fingerprint);
  assert.notEqual(rows[5].fingerprint, rows[4].fingerprint, 'manual constraint invalidates assessment');
  assert.equal(rows[5].fingerprint, rows[6].fingerprint);
  assert.equal(rows[7].fingerprint, rows[4].fingerprint, 'constraint removal restores original signature');
  assert.deepEqual(rows.slice(3).map(row => row.manualAvailable), [true, true, false, false, true]);
}
module.exports = { verifyRoomAssessment, changeAssessmentSites };
