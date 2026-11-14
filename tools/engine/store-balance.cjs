const assert = require('node:assert/strict');
const { storageLossWorld } = require('./storage-loss.cjs');
async function storeBalanceWorld(server, bot, mode) {
  await storageLossWorld(server, bot);
  const { db } = await server.world.load();
  const storage = mode === 'drain' ? { energy: 70000 } : mode === 'mineral' ? { energy: 80000, H: 30 } : { energy: 80000 };
  const terminal = { energy: mode === 'drain' ? 30030 : mode === 'mineral' ? 25000 : 19970 };
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: storage } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'terminal' }, { $set: { store: terminal } });
}
function verifyStoreBalance(memory, mode) {
  const expected = mode === 'drain' ? [70030, 30000, 0, 0, 0] : mode === 'mineral' ? [80000, 25000, 0, 30, 0] : [79970, 20000, 0, 0, 0];
  assert.deepEqual(memory.storeBalance.at(-1), expected);
  assert.deepEqual(memory.storeBalance.slice(-2), [expected, expected], 'Threshold boundary must remain stable');
  const records = memory.eldrift.records;
  const requests = records['logistics-requests/W0N1'].data.records;
  assert.equal(requests.length, 1);
  assert.equal(requests[0].request.owner, 'store-balance:W0N1');
  assert.equal(requests[0].request.resource, mode === 'mineral' ? 'H' : 'energy');
  assert.deepEqual(requests[0].receipts.map(receipt => receipt.amount), [30]);
  assert.deepEqual(records['tasks/hauler'].data.queue, []);
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { storeBalanceWorld, verifyStoreBalance };
