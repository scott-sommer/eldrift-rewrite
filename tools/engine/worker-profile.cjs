const assert = require('node:assert/strict');
const { workSelectionWorld } = require('./work-selection.cjs');
async function workerProfileWorld(server, bot, profile) {
  await workSelectionWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'build' }, { $set: { name: 'profile-' + profile, store: { energy: 0 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6 } });
  await server.world.addRoomObject('W0N1', 'storage', 25, 21, {
    user: bot.id, store: { energy: 50010 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
  await server.world.addRoomObject('W0N1', 'terminal', 18, 21, {
    user: bot.id, store: { energy: 35001 }, storeCapacity: 300000, hits: 3000, hitsMax: 3000,
  });
  await server.world.addRoomObject('W0N1', 'link', 19, 20, {
    user: bot.id, store: { energy: (profile === 'hold' || profile === 'flag-hold') ? 0 : 401 }, storeCapacityResource: { energy: 800 }, cooldown: 0, hits: 1000, hitsMax: 1000,
  });
  await server.world.addRoomObject('W0N1', 'energy', 19, 22, { energy: profile === 'upgrader' ? 20 : 60, resourceType: 'energy' });
}
function verifyWorkerProfile(memory, profile) {
  const rows = memory.workerProfile;
  if (profile === 'hold' || profile === 'flag-hold') {
    assert.deepEqual(rows.map(row => row[0]), profile === 'hold' ? [0, 0, 0] : [0, 0]);
    assert.ok(rows.every(row => row[5] === 19 && row[6] === 21), 'held worker does not travel to remote storage');
    return;
  }
  assert.deepEqual(rows.map(row => row[0]), [0, 50, 45]);
  assert.ok(rows.every(row => row[3] === 50010));
  if (profile === 'builder') {
    assert.ok(rows[1][4] <= 10, 'builder collects the nearby qualifying drop');
    assert.equal(rows[1][1], 401); assert.equal(rows[1][2], 35001);
  } else if (profile === 'fortifier') {
    assert.equal(rows[1][2], 34951); assert.equal(rows[1][1], 401);
  } else {
    assert.equal(rows[1][1], 351); assert.equal(rows[1][2], 35001);
  }
}
module.exports = { workerProfileWorld, verifyWorkerProfile };
