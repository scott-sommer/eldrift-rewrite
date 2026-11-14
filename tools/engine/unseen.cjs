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

async function occupiedExitWorld(server, bot) {
  await unseenWorld(server, bot);
  await server.world.addRoomObject('E0N1', 'creep', 0, 20, {
    name: 'edge-blocker', user: bot.id, body: [{ type: 'work', hits: 100 }],
    store: {}, storeCapacity: 0, hits: 100, hitsMax: 100, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyOccupiedExit(memory) {
  const evidence = memory.occupiedExit;
  assert.deepEqual(evidence.reasons, Array(3).fill('dependency-blocked'));
  assert.deepEqual(evidence.mover.map(JSON.parse), Array(3).fill({ room: 'W0N1', x: 48, y: 20 }));
  assert.deepEqual(evidence.blocker.map(JSON.parse), [
    { room: 'E0N1', x: 0, y: 20 }, { room: 'E0N1', x: 0, y: 20 }, { room: 'E0N1', x: 0, y: 20 },
  ]);
}
module.exports.occupiedExitWorld = occupiedExitWorld;
module.exports.verifyOccupiedExit = verifyOccupiedExit;

