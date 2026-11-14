const assert = require('node:assert/strict');
const { movementWorld } = require('./movement.cjs');
async function recoveryWorld(server, bot) {
  await movementWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'road', 21, 20, { hits: 5000, hitsMax: 5000, nextDecayTime: 1000 });
  await server.world.addRoomObject('W0N1', 'creep', 21, 20, {
    name: 'blocker', user: bot.id, body: [{ type: 'work', hits: 100 }], store: { energy: 0 }, storeCapacity: 0,
    hits: 100, hitsMax: 100, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyRecovery(memory) {
  const evidence = memory.recoveryEvidence;
  assert.deepEqual(evidence.positions.slice(0, 3), [[20, 20], [20, 20], [20, 20]]);
  assert.deepEqual(evidence.avoidance.slice(0, 3), [false, false, true]);
  assert.deepEqual(evidence.positions.at(-1), [22, 20]);
  assert.equal(evidence.outcomes.at(-1), 'done');
  assert.ok(evidence.positions.some(([x, y]) => x === 21 && y !== 20), 'Must detour around blocker');
  assert.ok(evidence.blockers.every(pos => pos[0] === 21 && pos[1] === 20), 'Blocker must remain stationary');
}
module.exports = { recoveryWorld, verifyRecovery };
