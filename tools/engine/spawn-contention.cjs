const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function contentionWorld(server, bot) {
  const { db } = await server.world.load();
  for (const room of ['W0N1', 'E0N1']) {
    await server.world.addRoom(room);
    await server.world.setTerrain(room, new TerrainMatrix());
    const controller = await db['rooms.objects'].findOne({ room, type: 'controller' });
    if (!controller) await server.world.addRoomObject(room, 'controller', 10, 10, { user: bot.id, level: 8, progress: 0, downgradeTime: 100000 });
    else await db['rooms.objects'].update({ _id: controller._id }, { $set: { user: bot.id, level: 8, downgradeTime: 100000 } });
  }
  for (const [room, name, energy] of [['W0N1', 'Spawn2', 0], ['E0N1', 'RemoteSpawn', 300]]) {
    await server.world.addRoomObject(room, 'spawn', 20, 20, { name, user: bot.id, store: { energy },
      storeCapacityResource: { energy: 300 }, hits: 5000, hitsMax: 5000, spawning: null, notifyWhenAttacked: true });
  }
}
function verifyContention(memory,evidence) {
  assert.deepEqual(memory.spawnContention.accepted.sort(), ['first', 'remote']);
  assert.deepEqual(memory.spawnContention.pending, ['second']);
  assert.deepEqual(memory.spawnContention.observed.sort(), ['first', 'remote']);
  const result = memory.spawnContention;
  assert.equal(result.homeSpawns.length,2); assert.equal(result.acceptedSpawn,result.selected);
  assert.deepEqual(result.incubatingAt,{ x: 20,y: 20 });
  evidence.spawnContention = result;
}
module.exports = { contentionWorld, verifyContention };
