const assert = require('node:assert/strict');
const { cargoRecoveryWorld } = require('./cargo-recovery.cjs');
async function preservationWorld(server, bot) {
  await cargoRecoveryWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'tombstone', 19, 19, {
    user: bot.id, store: { energy: 20, H: 30 }, deathTime: 0, decayTime: 1000,
    creepId: 'lost', creepName: 'lost', creepBody: ['carry'], creepTicksToLive: 0,
  });
}
function verifyPreservation(memory) {
  assert.deepEqual(memory.energySupply.at(-1), [30, 0, 20, 30]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(record => [record.request.resource, record.receipts.reduce((sum, item) => sum + item.amount, 0)]).sort(), [['H', 30], ['energy', 20]]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { preservationWorld, verifyPreservation };
