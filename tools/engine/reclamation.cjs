const assert = require('node:assert/strict');
const { energyLogisticsWorld } = require('./energy-logistics.cjs');
async function reclamationWorld(server, bot) {
  await energyLogisticsWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6 } });
  await server.world.addRoomObject('W0N1', 'lab', 19, 20, {
    user: bot.id, store: { energy: 30, H: 2000 }, storeCapacityResource: { energy: 2000, H: 3000 },
    hits: 500, hitsMax: 500, cooldown: 0,
  });
}
function verifyReclamation(memory) {
  assert.deepEqual(memory.reclamation, [[30, 2000, 0, 0], [30, 2000, 0, 0], [30, 2000, 0, 0],
    [30, 2000, 0, 0], [0, 2000, 30, 0], [0, 2000, 0, 30], [0, 2000, 0, 30]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.equal(records[0].request.resource, 'energy');
  assert.deepEqual(records[0].receipts.map(item => item.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { reclamationWorld, verifyReclamation };
