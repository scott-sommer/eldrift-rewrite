const assert = require('node:assert/strict');
const { mineralTransportWorld } = require('./mineral-transport.cjs');
async function mineralRecoveryWorld(server, bot, fallback = false) {
  await mineralTransportWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'hauler' }, { $set: { store: { H: 50 } } });
  if (fallback) await db['rooms.objects'].update({ room: 'W0N1', type: 'terminal' }, { $set: { store: { energy: 250000 } } });
}
function verifyMineralRecovery(memory, fallback = false) {
  assert.deepEqual(memory.mineralTransport.at(-1), fallback ? [50, 0, 0, 50, 100, 50000] : [50, 0, 50, 0, 100, 49970]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].receipts.map(receipt => receipt.amount), [50]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { mineralRecoveryWorld, verifyMineralRecovery };
