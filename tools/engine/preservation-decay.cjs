const assert = require('node:assert/strict');
const { cargoRecoveryWorld } = require('./cargo-recovery.cjs');
async function preservationDecayWorld(server, bot) {
  await cargoRecoveryWorld(server, bot);
  await require('@screeps/driver').activateRoom('W0N1');
  await server.world.addRoomObject('W0N1', 'tombstone', 19, 19, {
    user: bot.id, store: { H: 30 }, deathTime: 0, decayTime: 1,
    creepId: 'lost', creepName: 'lost', creepBody: ['carry'], creepTicksToLive: 0,
  });
}
function verifyPreservationDecay(memory) {
  assert.deepEqual(memory.energySupply.at(-1), [30, 0, 0, 29]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(record => record.cancelled), [true, true]);
  assert.deepEqual(records.map(record => record.receipts.map(item => item.amount)), [[], [29]]);
  assert.notEqual(records[0].request.source, records[1].request.source);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { preservationDecayWorld, verifyPreservationDecay };
