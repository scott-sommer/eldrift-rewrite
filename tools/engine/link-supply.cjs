const assert = require('node:assert/strict');
async function linkSupplyWorld(server, bot) {
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'source' }, { $set: { x: 10, y: 10 } });
  await server.world.addRoomObject('W0N1', 'storage', 20, 20, { user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  for (const [x, y, energy] of [[9, 10, 800], [10, 9, 800], [19, 20, 0]]) {
    await server.world.addRoomObject('W0N1', 'link', x, y, { user: bot.id, store: { energy }, storeCapacityResource: { energy: 800 }, cooldown: 0, hits: 1000, hitsMax: 1000 });
  }
}
function verifyLinkSupply(memory) {
  assert.deepEqual(memory.linkSupply, [[800, 800, 0], [0, 800, 776], [0, 776, 799]]);
}
module.exports = { linkSupplyWorld, verifyLinkSupply };
