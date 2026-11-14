const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function movementWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await server.world.addRoomObject('W0N1', 'creep', 20, 20, {
    name: 'walker', user: bot.id, body: [{ type: 'move', hits: 100 }],
    store: { energy: 0 }, storeCapacity: 0, hits: 100, hitsMax: 100, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyMovement(memory) {
  assert.deepEqual(memory.movementEvidence, { outcomes: ['running', 'done', 'done'], positions: [[20, 20], [21, 20], [21, 20]] });
}
module.exports = { movementWorld, verifyMovement };
