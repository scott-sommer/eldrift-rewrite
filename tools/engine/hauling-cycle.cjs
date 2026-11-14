const assert = require('node:assert/strict');
const { transferConfirmationWorld } = require('./transfer-confirmation.cjs');
async function drainHaulingSink(server, index) {
  if (index !== 3) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 21 }, { $set: { store: { energy: 1980 } } });
}
function verifyHaulingCycle(memory) {
  const evidence = memory.haulingCycle;
  assert.deepEqual(evidence.statuses, ['running', 'running', 'logistics-capacity-unavailable', 'running', 'running', 'done']);
  assert.deepEqual(evidence.outstanding, [30, 30, 20, 20, 20, 0]);
  assert.deepEqual(evidence.stores, [[30, 0, 1990], [20, 10, 1990], [20, 0, 2000], [20, 0, 1980], [0, 20, 1980], [0, 0, 2000]]);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
  assert.equal(memory.eldrift.records['logistics-requests/W0N1'].data.records[0].receipts.length, 2);
}
module.exports = { haulingCycleWorld: transferConfirmationWorld, drainHaulingSink, verifyHaulingCycle };
