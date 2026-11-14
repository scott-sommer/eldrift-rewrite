const assert = require('node:assert/strict');
const { cargoRecoveryWorld } = require('./cargo-recovery.cjs');
async function energyBankingWorld(server, bot, fallback = false) {
  await cargoRecoveryWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'source' }, { $set: { x: 18, y: 20 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 21 }, { $set: { store: { energy: 100 } } });
  if (fallback) {
    await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy: 950000 } } });
    await server.world.addRoomObject('W0N1', 'terminal', 21, 19, { user: bot.id, store: { energy: 0 }, storeCapacity: 300000, hits: 3000, hitsMax: 3000 });
  }
}
function verifyEnergyBanking(memory, fallback = false) {
  assert.deepEqual(memory.energyBanking.at(-1), fallback ? [0, 0, 950000, 100, 30] : [0, 0, 30, 100, 0]);
  const records = memory.eldrift.records;
  const requests = records['logistics-requests/W0N1'].data.records;
  assert.equal(requests.length, 1);
  assert.ok(requests[0].request.owner.endsWith(':bank'));
  assert.deepEqual(requests[0].receipts.map(receipt => receipt.amount), [30]);
  assert.deepEqual(records['tasks/hauler'].data.queue, []);
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { energyBankingWorld, verifyEnergyBanking };
