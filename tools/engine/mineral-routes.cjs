const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { courierRoutesWorld } = require('./courier-routes.cjs');
async function mineralRoutesWorld(server, bot) {
  await courierRoutesWorld(server, bot);
  const terrain = new TerrainMatrix();
  for (let y = 0; y < 50; y++) for (let x = 0; x < 50; x++) terrain.set(x, y, 'wall');
  for (let x = 15; x <= 26; x++) terrain.set(x, 15, 'swamp');
  terrain.set(15, 16, 'plain');
  await server.world.setTerrain('W0N1', terrain);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'mineral' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6 } });
  await db['rooms.objects'].update({ room: 'W0N1', name: 'miner' }, { $set: {
    body: [...Array(12).fill('work'), 'move'].map(type => ({ type, hits: 100 })), hits: 1300, hitsMax: 1300,
  } });
  await server.world.addRoomObject('W0N1', 'mineral', 26, 15, { mineralType: 'H', mineralAmount: 1000, density: 1 });
  await server.world.addRoomObject('W0N1', 'extractor', 26, 15, { user: bot.id, cooldown: 0, hits: 500, hitsMax: 500 });
  await server.world.addRoomObject('W0N1', 'terminal', 15, 16, { user: bot.id, store: {}, storeCapacity: 300000, hits: 3000, hitsMax: 3000, cooldown: 0 });
}
function verifyMineralFleet(memory) {
  assert.deepEqual(memory.mineralFleet, [
    { count: 3, capacity: 50, required: 142.5 },
    { count: 3, capacity: 50, required: 142.5 },
    { count: 2, capacity: 50, required: 52.5 },
  ]);
}
module.exports = { mineralRoutesWorld, verifyMineralFleet };
