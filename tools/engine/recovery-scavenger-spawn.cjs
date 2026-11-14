const assert = require('node:assert/strict');
const { recoveryEconomyWorld } = require('./recovery-economy.cjs');
async function recoveryScavengerSpawnWorld(server, bot) {
  await recoveryEconomyWorld(server, bot);
  for (const x of [12, 13]) for (let y = 13; y <= 17; y++) {
    await server.world.addRoomObject('W0N1', 'extension', x, y, {
      user: bot.id, store: { energy: 0 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000,
    });
  }
  await server.world.addRoomObject('W0N1', 'tombstone', 16, 15, {
    user: bot.id, store: { energy: 1500 }, deathTime: 0, decayTime: 1000,
    creepId: 'lost', creepName: 'lost', creepBody: ['carry'], creepTicksToLive: 0,
  });
}
function verifyRecoveryScavengerSpawn(memory) {
  const rows = memory.recoveryScavengerSpawn;
  console.log('SCAVENGER_SPAWN_SUMMARY ' + JSON.stringify({ first: rows[0], last: rows.at(-1) }));
  assert.equal(rows[0].energyCapacity, 800);
  assert.equal(rows[0].scavengers.length, 1, 'first spawn is a recovery scavenger');
  assert.equal(rows[0].scavengers[0].parts, 6, 'first body snapshots available300 of capacity800 energy');
  assert.equal(rows[0].scavengers[0].spawning, true);
  assert.equal(rows[0].miners, 0);
  assert.ok(rows.some(row => row.scavengers.some(unit => !unit.spawning && unit.parts === 6)));
  assert.ok(rows.some(row => row.queued.some(request => request.parts === 15 && request.priority === 1)), 'full800budget escalation is queued after the first spawn');
  for (const row of rows.filter(row => row.scavengers.length === 1 && row.scavengers[0].spawning)) assert.deepEqual(row.queued, []);
  const last = rows.at(-1);
  assert.equal(last.scavengers.filter(unit => !unit.spawning).length, 2);
  assert.deepEqual(last.scavengers.map(unit => unit.parts).sort((a, b) => a - b), [6, 15]);
  assert.ok(last.miners >= 1);
  assert.ok(last.couriers >= 1);
  assert.ok(last.tombEnergy < 1500, 'scavengers execute shared energy collection');
  assert.ok(last.consumerDelivered > 200, 'confirmed delivery replenishes spawn infrastructure');
  assert.deepEqual(last.queued, [], 'full-size commitment stops escalation');
}
module.exports = { recoveryScavengerSpawnWorld, verifyRecoveryScavengerSpawn };
