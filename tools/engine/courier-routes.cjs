const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function courierRoutesWorld(server, bot) {
  const terrain = new TerrainMatrix();
  for (let y = 0; y < 50; y++) for (let x = 0; x < 50; x++) terrain.set(x, y, 'wall');
  for (let x = 15; x <= 26; x++) terrain.set(x, 15, 'swamp');
  await server.world.setTerrain('W0N1', terrain);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  await server.world.addRoomObject('W0N1', 'source', 26, 15, { energy: 600, energyCapacity: 600 });
  await server.world.addRoomObject('W0N1', 'container', 25, 15, { store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
  await server.world.addRoomObject('W0N1', 'creep', 25, 15, { name: 'miner', user: bot.id,
    body: ['work', 'move'].map(type => ({ type, hits: 100 })), store: {}, storeCapacity: 0,
    hits: 200, hitsMax: 200, spawning: false, fatigue: 0, ageTime: 1500 });
}
async function improveCourierRoad(server, index) {
  if (index !== 2) return;
  for (let x = 16; x <= 24; x++) await server.world.addRoomObject('W0N1', 'road', x, 15, { hits: 5000, hitsMax: 5000, nextDecayTime: 1000 });
}
function verifyCourierRoutes(memory) {
  const [swamp, cached, road] = memory.courierRoutes;
  assert.equal(swamp.routes.length, 1);
  assert.deepEqual(cached, swamp);
  assert.equal(swamp.routes[0].production, 2);
  assert.equal(swamp.routes[0].outboundTicks, 8);
  assert.equal(swamp.routes[0].loadedReturnTicks, 90);
  assert.equal(swamp.replacement, 9);
  assert.equal(swamp.required, 255);
  assert.equal(road.routes[0].loadedReturnTicks, 9);
  assert.equal(road.required, 52.5);
}
module.exports = { courierRoutesWorld, improveCourierRoad, verifyCourierRoutes };
