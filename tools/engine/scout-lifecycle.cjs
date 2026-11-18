const assert = require('node:assert/strict');
const { intelObservationWorld } = require('./intel-observation.cjs');
async function scoutLifecycleWorld(server, bot) {
  await intelObservationWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'creep', 24, 24, { name: 'expiring-scout', user: bot.id,
    body: [{ type: 'move', hits: 100 }], store: {}, storeCapacity: 0, hits: 100, hitsMax: 100,
    spawning: false, fatigue: 0, ageTime: 4 });
}
async function changeScoutLifecycle(server, tick) {
  // Read-only bot work emits no room intents; explicitly run real aging processors.
  await server.driver.activateRoom(['W0N1','E0N1']);
  const { db } = await server.world.load();
  if (tick === 2) await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { user: null, level: 0 } });
}
function verifyScoutLifecycle(memory, evidence) {
  const rows = memory.scoutLifecycleRows, last = rows.at(-1), history = memory.eldrift.records['scouting/empire'];
  evidence.scoutLifecycle = { rows, history, witness: memory.scoutLifecycleWitness, sentinel: memory.eldrift.records['sentinel/keep'],
    remote: memory.eldrift.records['intel/E0N1'], injectedDeath: memory.scoutLifecycleInjectedDeath, reloads: memory.stampReloads };
  console.log('SCOUT_LIFECYCLE ' + JSON.stringify(rows));
  assert.equal(rows.length, 12);
  assert.deepEqual(memory.stampReloads, [5]);
  assert.deepEqual(memory.scoutLifecycleInjectedDeath, { tick: 4, result: 0 });
  assert.equal(last.active.length, 0);
  assert.equal(last.losses.length, 2);
  const early = last.losses.find(loss => loss.name === 'intel-visitor');
  const expired = last.losses.find(loss => loss.name === 'expiring-scout');
  assert.equal(early.kind, 'early-disappearance');
  assert.equal(early.detectedAt, 5);
  assert.equal(early.seenAt, 4);
  assert.deepEqual(early.position, { room: 'E0N1', x: 25, y: 25 });
  assert.equal(expired.kind, 'expired');
  assert.equal(expired.expiresAt, 4);
  assert.ok(expired.detectedAt >= expired.expiresAt);
  assert.ok(last.losses.every(loss => !loss.failurePending));
  assert.ok(rows.slice(4).every(row => !row.active.length && row.losses.length === 2 && row.sources === 2));
  const hidden = rows.filter(row => !row.visible);
  assert.ok(hidden.length >= 2, 'actual vision loss must be exercised after early death');
  const lastVisible = rows.filter(row => row.visible).at(-1);
  assert.ok(hidden.every(row => row.remoteSeen === lastVisible.tick && row.sources === 2));
  assert.equal(last.remoteFailure.id, 'scout-loss:' + early.id);
  assert.equal(last.remoteFailure.tick, 5);
  assert.deepEqual(last.danger, [{ room: 'E0N1', count: 1, until: 5006 }]);
  assert.ok(rows.every(row => row.homeSeen === row.tick));
  assert.equal(memory.scoutLifecycleWitness.initializedAt, 1);
  assert.equal(JSON.stringify(memory.eldrift.records['sentinel/keep']), memory.scoutLifecycleWitness.value);
  assert.equal(history.owner, 'scouting');
}
module.exports = { scoutLifecycleWorld, changeScoutLifecycle, verifyScoutLifecycle };
