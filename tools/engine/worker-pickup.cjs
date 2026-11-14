const assert = require('node:assert/strict');
const { workSelectionWorld } = require('./work-selection.cjs');
async function workerPickupWorld(server, bot) {
  await workSelectionWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'build' }, { $set: { store: { energy: 0 } } });
  await server.world.addRoomObject('W0N1', 'energy', 19, 22, { energy: 30, resourceType: 'energy' });
}
function verifyWorkerPickup(memory) {
  const rows = memory.workerPickup;
  assert.equal(rows[0][0], 0);
  assert.equal(rows[1][0], 0, 'partial stock booking prevents unbounded pickup');
  assert.ok(rows[1][1] > 0 && rows[1][1] <= 30);
  assert.equal(rows[2][0], rows[1][1], 'pickup receives all remaining unreserved energy');
  assert.equal(rows[2][1], 0);
  assert.equal(rows[3][0], rows[2][0] - 5, 'partially filled worker starts construction when supply is exhausted');
  assert.equal(rows[3][2], 0);
  assert.equal(rows[4][0], rows[3][0] - 1);
  assert.equal(rows[5][3], 1, 'worker resumes upgrading');
}
module.exports = { workerPickupWorld, verifyWorkerPickup };
