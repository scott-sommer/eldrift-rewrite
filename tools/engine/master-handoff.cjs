const assert = require('node:assert/strict');
const { masterBootstrapWorld } = require('./upgrade-master-bootstrap.cjs');
async function masterHandoffWorld(server, bot) {
  await masterBootstrapWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy: 4000 } } });
  await db['rooms.objects'].update({ room: 'E0N1', type: 'spawn' }, { $set: { store: { energy: 50 } } });
  for (let index = 0; index < 5; index++) await server.world.addRoomObject('E0N1', 'extension', 10 + index, 30, {
    user: bot.id, store: { energy: 50 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000 });
  for (const [name, x, y, parts, energy] of [
    ['master',2,21,['move', ...Array(18).fill('carry')],0],
    ['supplier',4,21,[...Array(17).fill('move'), ...Array(33).fill('carry')],900],
  ]) await server.world.addRoomObject('E0N1', 'creep', x, y, { name, user: bot.id,
    body: parts.map(type => ({ type, hits: 100 })), store: { energy },
    storeCapacity: parts.filter(type => type === 'carry').length * 50, hits: parts.length * 100,
    hitsMax: parts.length * 100, spawning: false, fatigue: 0, ageTime: 1500 });
  await server.world.addRoomObject('E0N1', 'container', 2, 22, { store: {}, storeCapacity: 2000,
    hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
}
async function consumeMasterSpawnEnergy(server, index) {
  if (index !== 10) return;
  const { db } = await server.world.load();
  const spawn = await db['rooms.objects'].findOne({ room: 'E0N1', type: 'spawn' });
  assert.equal(spawn.store.energy, 300, 'fixture consumes a previously observed filled spawn');
  await db['rooms.objects'].update({ _id: spawn._id }, { $set: { store: { energy: 50 } } });
}
function verifyMasterHandoff(memory) {
  const rows = memory.masterHandoff;
  console.log('MASTER_HANDOFF ' + JSON.stringify(rows.map(({tick,master,supplier,storage,spawn,container,serviceReceived,masterAttempt}) =>
    ({tick,master,supplier,storage,spawn,container,serviceReceived,attempt: masterAttempt && {kind:masterAttempt.kind,tick:masterAttempt.tick,amount:masterAttempt.amount}}))));
  assert.equal(rows.length, 20);
  assert.deepEqual(memory.stampReloads, [3,11]);
  assert.equal(rows[1].adjacent, true);
  assert.equal(rows[1].master, 0);
  assert.ok(!rows[1].masterAttempt || rows[1].masterAttempt.tick !== 2 || rows[1].masterAttempt.kind !== 'withdraw',
    'empty low-RCL master yields collection to adjacent loaded supplier');
  assert.equal(rows[2].master, 900);
  assert.equal(rows[2].supplier, 0);
  assert.ok(rows.some(row => row.incoming.result?.status === 'observed' && row.incoming.result.amount === 900));
  assert.ok(rows.some(row => row.tick > 11 && row.adjacent && row.supplier === 0 && row.masterAttempt?.kind === 'withdraw'),
    'an empty adjacent supplier must not stall later service collection');
  for (const row of rows) {
    assert.equal(row.storage + row.spawn + row.container + row.master + row.supplier + row.extensions, 301200 - (row.tick >= 11 ? 250 : 0));
    assert.ok(row.master >= 0 && row.master <= 900);
    assert.deepEqual([row.x,row.y], [2,21]);
    assert.equal(row.level, 2);
    assert.equal(row.source, 4000);
    assert.equal(row.total, 2);
  }
  const last = rows.at(-1);
  assert.equal(last.master, 0);
  assert.equal(last.supplier, 0);
  assert.equal(last.storage, 299800);
  assert.equal(last.spawn, 250);
  assert.equal(last.container, 650);
  assert.equal(last.serviceReceived, 200);
}
module.exports = { masterHandoffWorld, consumeMasterSpawnEnergy, verifyMasterHandoff };
