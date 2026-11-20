const assert = require('node:assert/strict');
const { cargoRecoveryWorld } = require('./cargo-recovery.cjs');
async function finalDeliveryWorld(server, bot) {
  await cargoRecoveryWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'creep',name: 'hauler' }, { $set: { ageTime: 3 } });
}
function verifyFinalDelivery(memory) {
  assert.deepEqual(memory.finalDelivery, [[1,2,30,0,0],[2,1,0,30,0],[3,0,0,-1,30],[4,0,0,-1,30]]);
  const records = memory.eldrift.records;
  const request = records['logistics-requests/W0N1'].data.records.find(item => item.id === 'lost-sink');
  assert.deepEqual(request.receipts.map(item => item.amount), [30], 'Final alive-tick delivery must settle after natural death');
  assert.deepEqual(records['tasks/hauler'].data.queue, []);
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
  const archived = records['logistics-retired/empire'].data.entries[0].journal;
  assert.equal(archived.acknowledged, true);
  assert.deepEqual(archived.result, { status: 'observed',amount: 30 });
}
module.exports = { finalDeliveryWorld,verifyFinalDelivery };
