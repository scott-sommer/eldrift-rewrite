const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function unseenWorld(server, bot) {
  for (const room of ['W0N1', 'E0N1']) {
    await server.world.addRoom(room);
    await server.world.setTerrain(room, new TerrainMatrix());
  }
  await server.world.addRoomObject('W0N1', 'creep', 48, 20, {
    name: 'explorer', user: bot.id, body: [{ type: 'move', hits: 100 }],
    store: {}, storeCapacity: 0, hits: 100, hitsMax: 100, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyUnseen(memory) {
  assert.deepEqual(memory.unseenNavigation, {
    visible: [false, true, true], rooms: ['W0N1', 'E0N1', 'E0N1'], statuses: ['running', 'running', 'done'],
  });
}
module.exports = { unseenWorld, verifyUnseen };
