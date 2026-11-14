const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { recoveryScavengingWorld } = require('./recovery-scavenging.cjs');
async function distributorRecoveryWorld(server, bot) {
  await recoveryScavengingWorld(server, bot);
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'tombstone' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'energy' });
  await db['rooms.objects'].update({ room: 'W0N1', name: 'rescuer' }, { $set: { store: { energy: 50 } } });
}
async function changeDistributorEnergy(server, tick, bot, modules) {
  if (tick === 12) {
    const { db, env } = server.common.storage;
    const main = modules.main + '\nMemory.distributorReload = Game.time;';
    await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
    await env.del('scrScriptCachedData:' + bot.id);
    return main;
  }
  if (tick !== 5 && tick !== 7) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' },
    { $set: { store: { energy: tick === 5 ? 12500 : 12501 } } });
}
function verifyDistributorRecovery(memory) {
  const rows = memory.distributorRecovery;
  const owner = 'logistics:"W0N1"';
  console.log('DISTRIBUTOR_RECOVERY_SUMMARY ' + JSON.stringify({ first: rows[0], equality: rows[5], restart: rows[7], last: rows.at(-1) }));
  assert.equal(rows[0].units[0].owner, owner + ':distributor');
  assert.equal(rows[0].journal.acknowledged, false);
  assert.ok(rows[0].journal.attempt);
  assert.ok(rows.slice(1).every(row => row.units.find(unit => unit.name === 'rescuer').owner === owner));
  assert.equal(rows[1].journal.acknowledged, true);
  assert.equal(rows[1].stored, 50);
  assert.equal(rows[1].journal.attempt.id, rows[0].journal.attempt.id);
  assert.deepEqual(rows[1].journal.result, { status: 'observed', amount: 50 });
  assert.ok(rows.slice(0, 7).every(row => row.queue.data.requests.length === 0));
  assert.ok(memory.distributorReload >= 13);
  assert.ok(rows.slice(0, 7).every(row => row.units.length === 1));
  assert.equal(rows[5].stored, 12500);
  assert.equal(rows[6].stored, 12500);
  // Native spawning becomes visible on the tick after admission.
  assert.ok(rows.slice(8).some(row => row.units.some(unit => unit.spawning && unit.owner === owner + ':distributor')));
  const last = rows.at(-1);
  assert.equal(last.units.length, 2);
  const distributor = last.units.find(unit => unit.name !== 'rescuer');
  assert.equal(distributor.owner, owner + ':distributor');
  assert.equal(distributor.spawning, false);
  assert.deepEqual(distributor.body, ['carry', 'carry', 'carry', 'carry', 'move', 'move']);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.ok(records.flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0) >= 50);
  assert.ok(rows.every(row => row.units.length <= 2));
}
module.exports = { distributorRecoveryWorld, changeDistributorEnergy, verifyDistributorRecovery };
