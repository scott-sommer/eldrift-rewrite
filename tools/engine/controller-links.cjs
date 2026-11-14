const assert = require('node:assert/strict');
const { linkSupplyWorld } = require('./link-supply.cjs');
async function controllerLinksWorld(server, bot) {
  await linkSupplyWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 30, y: 30 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy: 1000 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'link', x: 19 }, { $set: { store: { energy: 800 } } });
  await server.world.addRoomObject('W0N1', 'link', 29, 30, { user: bot.id, store: { energy: 0 }, storeCapacityResource: { energy: 800 }, cooldown: 0, hits: 1000, hitsMax: 1000 });
}
function verifyControllerLinks(memory) {
  assert.deepEqual(memory.controllerLinks, [[800, 800, 800, 0], [800, 800, 800, 0], [0, 800, 800, 776], [0, 800, 800, 776]]);
}
module.exports = { controllerLinksWorld, verifyControllerLinks };
