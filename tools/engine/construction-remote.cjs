const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function constructionRemoteWorld(server, bot) {
  await server.world.addRoom('E0N1');
  await server.world.setTerrain('E0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'controller' });
  await server.world.addRoomObject('E0N1', 'controller', 10, 10, { level: 0, reservation: { user: bot.id, endTime: 10000 } });
  await server.world.addRoomObject('E0N1', 'creep', 20, 20, { name: 'remote-observer', user: bot.id,
    body: [{ type: 'move', hits: 100 }], hits: 100, hitsMax: 100, store: {}, storeCapacity: 0,
    spawning: false, fatigue: 0, ageTime: 1500, notifyWhenAttacked: false });
}
function verifyConstructionRemote(memory) {
  const rows = memory.constructionRemoteRows;
  assert.equal(rows.length, 6);
  assert.equal(rows.reduce((sum, row) => sum + row.created, 0), 2);
  assert.deepEqual([...rows.at(-1).sites].sort(), ['container', 'road']);
  assert.ok(rows.every(row => row.level === 0 && row.stage === 1));
  assert.ok(rows.every(row => row.forbidden === 'remote-structure-type' && row.unapproved === 'remote-not-approved'));
  console.log('CONSTRUCTION_REMOTE ' + JSON.stringify(rows));
}
module.exports = { constructionRemoteWorld, verifyConstructionRemote };
