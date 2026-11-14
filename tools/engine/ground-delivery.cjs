const assert = require('node:assert/strict');
async function groundDeliveryWorld(server, bot) {
  await server.world.addRoomObject('W0N1', 'creep', 20, 21, { name: 'dropper', user: bot.id,
    body: ['carry', 'carry', 'move'].map(type => ({ type, hits: 100 })), store: { energy: 80 }, storeCapacity: 100,
    hits: 300, hitsMax: 300, fatigue: 0, spawning: false, ageTime: 1500 });
  await server.world.addRoomObject('W0N1', 'energy', 20, 21, { energy: 1000, resourceType: 'energy' });
}
async function reloadGroundDelivery(server, bot, modules, index) {
  if (index !== 1) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.groundReload = true;';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyGroundDelivery(memory, recovering = false) {
  const rows = memory.groundDelivery;
  console.log('GROUND_DELIVERY_SUMMARY ' + JSON.stringify(rows));
  assert.equal(memory.groundReload, true);
  assert.equal(rows[0].issued.status, 'issued');
  assert.equal(rows[0].duplicate.status, 'blocked');
  assert.equal(rows[1].cargo, 30);
  if (recovering) {
    assert.equal(rows[1].result, null);
    assert.deepEqual(rows[2].result, { status: 'unknown' });
    assert.equal(rows[2].recovered, true);
    assert.deepEqual(rows[2].journal.result, { status: 'reconciled', tick: 3, cargo: 30 });
    assert.equal(rows[3].resumed.status, 'issued');
    assert.equal(rows[3].journal.attempt.amount, 30);
    assert.deepEqual(rows[4].result, { status: 'released', amount: 30 });
    assert.equal(rows[4].cargo, 0);
    return;
  }
  assert.deepEqual(rows[1].result, { status: 'released', amount: 50 });
  assert.equal(rows[1].journal.attempt.id, 'release');
  assert.equal(rows[1].journal.acknowledged, false);
  assert.ok(rows[1].ground >= 1048 && rows[1].ground <= 1050);
  assert.equal(rows.at(-1).cargo, 30);
}
module.exports = { groundDeliveryWorld, reloadGroundDelivery, verifyGroundDelivery };
