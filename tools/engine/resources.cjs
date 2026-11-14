const assert = require('node:assert/strict');
async function resourceWorld(server, bot) {
  for (const [x, energy] of [[19, 30], [21, 0]]) {
    await server.world.addRoomObject('W0N1', 'container', x, 20, { store: { energy }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
  }
  await server.world.addRoomObject('W0N1', 'creep', 20, 20, {
    name: 'hauler', user: bot.id, body: ['carry', 'move'].map(type => ({ type, hits: 100 })),
    store: { energy: 0 }, storeCapacity: 50, hits: 200, hitsMax: 200, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyResources(memory) {
  assert.deepEqual(memory.resourceEvidence, { outcomes: ['running', 'running', 'done'], stores: [[30, 0, 0], [20, 10, 0], [20, 0, 10]] });
}
module.exports = { resourceWorld, verifyResources };
