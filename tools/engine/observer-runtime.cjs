const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { intelObservationWorld } = require('./intel-observation.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function observerRuntimeWorld(server, bot) {
  await intelObservationWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'creep', name: 'intel-visitor' });
  await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { user: null, level: 0 } });
  for (const home of ['W0N1','W1N1']) {
    await db['rooms.objects'].update({ room: home, type: 'controller' }, { $set: { user: bot.id, level: 8, progress: 0, downgradeTime: 20000 } });
    await server.world.addRoomObject(home, 'observer', 24, 24, { user: bot.id, hits: 500, hitsMax: 500 });
  }
  for (const room of ['W1N0','W2N1']) await server.world.setTerrain(room, new TerrainMatrix());
}
async function changeObserverRuntime(server, bot, modules, index) {
  return reloadStampDraft(server, bot, modules, index, [3,11]);
}
function verifyObserverRuntime(memory, evidence) {
  const rows = memory.observerRows, records = memory.eldrift.records;
  evidence.observers = { rows, reloads: memory.stampReloads, state: records['observations/empire'],
    intel: Object.fromEntries(Object.entries(records).filter(([key]) => key.startsWith('intel/'))) };
  assert.deepEqual(evidence.messages, []); assert.deepEqual(evidence.errors, []);
  assert.equal(rows.length, 24); assert.deepEqual(memory.stampReloads, [4,12]);
  const first = rows[0];
  assert.deepEqual(first.issued, []); assert.ok(first.after.every(room => !room.visible && room.seen === null));
  for (const row of rows) {
    assert.ok(row.issued.length <= 1, 'empire issue cap must apply across both homes');
    assert.ok(row.after.filter(room => room.seen === row.tick).length <= 1, 'capture cap must apply across visible targets');
    assert.ok(row.after.every(room => room.visited === null), 'observer vision cannot imply physical visits');
    assert.equal(JSON.stringify(row.witness), JSON.stringify(first.witness));
    if ([1,4,6,8,10].includes(row.tick)) assert.deepEqual(row.issued, [], 'explicit admission pause cannot issue');
    for (const room of row.after) {
      if (!room.visible) assert.equal(room.seen, row.before.find(item => item.room === room.room).seen, 'unseen is not an empty refresh');
    }
  }
  const receipts = rows.at(-1).receipts;
  assert.ok(receipts.some(item => item.request.id === 'manual-initial' && item.outcome === 'observed'));
  assert.ok(receipts.some(item => item.request.id === 'manual-far' && item.outcome === 'rejected' && item.code === -9));
  assert.ok(receipts.some(item => item.request.id === 'manual-unowned' && item.outcome === 'expired' && item.issuedAt === null));
  assert.ok(receipts.some(item => item.outcome === 'missed'), 'paused capture must become a missed receipt');
  for (const receipt of receipts.filter(item => item.outcome === 'observed')) {
    assert.equal(receipt.completedAt, receipt.issuedAt + 1);
    const row = rows.find(item => item.tick === receipt.completedAt);
    assert.ok(row.after.find(room => room.room === receipt.request.room).visible);
  }
  for (const room of ['E0N1','W1N0','W2N1']) assert.ok(rows.some(row => row.after.some(item => item.room === room && item.seen === row.tick)), 'all assigned targets need service');
  for (const home of ['W0N1','W1N1']) assert.ok(receipts.some(item => item.request.home === home && item.outcome === 'observed'));
  const known = records['intel/E0N1'].data;
  assert.equal(known.summary.sources.length, 2); assert.equal(known.summary.mineral.type, 'H');
  assert.ok(known.summary.exits.length > 0); assert.equal(known.lastVisit, null);
  assert.ok(rows.find(row => row.tick === 8).after.some(room => room.seen === 8), 'pending vision capture stays urgent while background discovery is paused');
}
module.exports = { observerRuntimeWorld, changeObserverRuntime, verifyObserverRuntime };
