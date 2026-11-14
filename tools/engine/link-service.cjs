const assert = require('node:assert/strict');
const { controllerLinksWorld } = require('./controller-links.cjs');
async function linkServiceWorld(server, bot) {
  await controllerLinksWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'link' }, { $set: { store: { energy: 0 } } });
  await server.world.addRoomObject('W0N1', 'creep', 20, 19, { name: 'courier', user: bot.id,
    body: ['carry', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'].map(type => ({ type, hits: 100 })),
    store: { energy: 0 }, storeCapacity: 200, hits: 800, hitsMax: 800, spawning: false, fatigue: 0, ageTime: 1500 });
}
function verifyLinkService(memory) {
  const rows = memory.linkService;
  assert.deepEqual(rows.slice(0, 4), [[1000, 0, 0, 0], [800, 200, 0, 0], [800, 0, 200, 0], [800, 0, 0, 194]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.ok(records.some(record => record.request.owner === 'link-service:W0N1' && record.receipts.some(receipt => receipt.amount === 200)));
  assert.equal(records.filter(record => !record.cancelled && record.receipts.length === 0).length, 1);
}
module.exports = { linkServiceWorld, verifyLinkService };

