const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function trafficWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  for (const [name, x] of [['a', 20], ['b', 21], ['c', 22]]) {
    await server.world.addRoomObject('W0N1', 'creep', x, 20, {
      name, user: bot.id, body: [{ type: 'move', hits: 100 }], store: { energy: 0 }, storeCapacity: 0,
      hits: 100, hitsMax: 100, spawning: false, fatigue: 0, ageTime: 1500,
    });
  }
}
function verifyTraffic(memory) {
  assert.deepEqual(memory.trafficEvidence.accepted, ['a', 'b']);
  assert.deepEqual(memory.trafficEvidence.denied, [{ unit: 'c', reason: 'destination-conflict' }]);
  assert.deepEqual(memory.trafficEvidence.positions, [[20,21,22], [21,20,22], [21,20,22]]);
  assert.deepEqual(memory.trafficEvidence.intents, ['issued', 'issued']);
}
module.exports = { trafficWorld, verifyTraffic };
