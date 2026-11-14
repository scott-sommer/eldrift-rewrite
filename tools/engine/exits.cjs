const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const starts = [
  ['east', 'W0N1', 48, 20], ['west', 'E0N1', 1, 25],
  ['south', 'W1N0', 20, 48], ['north', 'W1S0', 25, 1],
];
async function exitsWorld(server, bot) {
  for (const room of ['W0N1', 'E0N1', 'W1N0', 'W1S0']) {
    await server.world.addRoom(room);
    await server.world.setTerrain(room, new TerrainMatrix());
  }
  for (const [name, room, x, y] of starts) {
    await server.world.addRoomObject(room, 'creep', x, y, {
      name, user: bot.id, body: [{ type: 'move', hits: 100 }],
      store: {}, storeCapacity: 0, hits: 100, hitsMax: 100,
      spawning: false, fatigue: 0, ageTime: 1500,
    });
  }
}
function verifyExits(memory) {
  assert.deepEqual(memory.exitEvidence, {
    east: [['W0N1', 48, 20], ['E0N1', 0, 20], ['E0N1', 1, 20]],
    west: [['E0N1', 1, 25], ['W0N1', 49, 25], ['W0N1', 48, 25]],
    south: [['W1N0', 20, 48], ['W1S0', 20, 0], ['W1S0', 20, 1]],
    north: [['W1S0', 25, 1], ['W1N0', 25, 49], ['W1N0', 25, 48]],
  });
}
module.exports = { exitsWorld, verifyExits };

function verifyNavigation(memory) {
  const targets = { east: ['E0N1', 1, 20], west: ['W0N1', 48, 25], south: ['W1S0', 20, 1], north: ['W1N0', 25, 48] };
  for (const [name, room, x, y] of starts) {
    const samples = memory.exitEvidence[name];
    assert.deepEqual(samples[0], [room, x, y]);
    assert.deepEqual(samples[2], targets[name]);
    assert.equal(samples[1][0], targets[name][0]);
    const horizontal = name === 'east' || name === 'west';
    assert.equal(samples[1][horizontal ? 1 : 2], name === 'east' || name === 'south' ? 0 : 49);
    assert.ok(Math.abs(samples[1][horizontal ? 2 : 1] - (horizontal ? y : x)) <= 1);
  }
}
module.exports.verifyNavigation = verifyNavigation;
