const assert = require('node:assert/strict');
const { energyBankingWorld } = require('./energy-banking.cjs');
async function bankingDemandWorld(server, bot) {
  await energyBankingWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 21 }, { $set: { store: { energy: 0 } } });
  await server.world.addRoomObject('W0N1', 'extension', 19, 19, { user: bot.id, store: { energy: 50 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000 });
}
async function createBankingDemand(server, index) {
  if (index !== 2) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'extension' }, { $set: { store: { energy: 20 } } });
}
function verifyBankingDemand(memory) {
  assert.deepEqual(memory.energyBanking.at(-1), [0, 0, 0, 0, 0, 50]);
  assert.ok(memory.energyBanking.some(row => row[2] === 30 && row[5] === 20), 'Admitted banking cargo settles before consumer refill');
  const records = memory.eldrift.records;
  const requests = records['logistics-requests/W0N1'].data.records;
  assert.equal(requests.length, 2);
  assert.ok(requests[0].request.owner.endsWith(':bank'));
  assert.equal(requests[1].request.priority, 1);
  for (const request of requests) assert.deepEqual(request.receipts.map(receipt => receipt.amount), [30]);
  assert.deepEqual(records['tasks/hauler'].data.queue, []);
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { bankingDemandWorld, createBankingDemand, verifyBankingDemand };
