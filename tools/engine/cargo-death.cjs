const assert = require('node:assert/strict');
const { courierDeathWorld } = require('./courier-death.cjs');
async function cargoDeathWorld(server, bot) {
  await courierDeathWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'a-hauler' }, { $set: { x: 20, y: 20 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
  await server.world.addRoomObject('W0N1', 'storage', 20, 18, { user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
}
function verifyCargoDeath(memory) {
  const rows = memory.cargoDeath;
  assert.equal(rows[1][0], 50, 'Courier dies carrying collected energy');
  assert.ok(rows.some(row => row[4] === 69), 'Native corpse includes 50 cargo plus 19 body energy');
  assert.deepEqual(rows.at(-1), [0, 0, 0, 69, 0]);
  const records = memory.eldrift.records;
  const requests = records['logistics-requests/W0N1'].data.records;
  assert.deepEqual(requests.find(record => record.request.owner === 'test').receipts, [], 'Recovered cargo must not credit the abandoned original delivery');
  const recovered = requests.filter(record => record.request.owner.endsWith(':preserve'));
  assert.equal(recovered.length, 1);
  assert.deepEqual(recovered[0].receipts.map(receipt => receipt.amount), [50, 19]);
  assert.deepEqual(records['tasks/a-hauler'].data.queue, []);
  assert.deepEqual(records['tasks/z-hauler'].data.queue, []);
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { cargoDeathWorld, verifyCargoDeath };

