const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { workerCollectionWorld } = require('./worker-collection.cjs');
async function workerCargoWorld(server, bot, mode) {
  await workerCollectionWorld(server, bot);
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'build' }, { $set: { store: { energy: 20, H: 30 } } });
  if (mode === 'store') return;
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'storage' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container' });
  if (mode === 'hold') await server.world.addRoomObject('W0N1', 'creep', 10, 10, { name: 'hold-marker', user: bot.id,
    body: [{ type: 'move', hits: 100 }], store: {}, storeCapacity: 0, hits: 100, hitsMax: 100, fatigue: 0, ageTime: 1500 });
}
function verifyWorkerCargo(memory, mode) {
  const rows = memory.workerCargo;
  const last = rows.at(-1);
  console.log('WORKER_CARGO_SUMMARY ' + JSON.stringify({ mode, first: rows[0], last }));
  assert.equal(rows[0].energy, 20, 'disposal never sends work energy to storage');
  if (mode === 'hold') {
    assert.ok(rows.every(row => row.hydrogen === 30 && row.energy === 20 && row.dropped === 0));
    assert.equal(last.sites, 1);
    return;
  }
  assert.equal(last.hydrogen, 0);
  assert.equal(last.sites, 0, 'worker resumes building');
  assert.ok(last.progress > 0, 'worker resumes upgrading');
  if (mode === 'drop') {
    assert.ok(rows.some(row => row.dropped > 0), 'no-destination fallback releases mineral cargo');
    assert.equal(last.stored, 0);
    return;
  }
  assert.equal(last.stored, 30);
  assert.ok(rows.every(row => row.dropped === 0));
  const requests = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.ok(requests.every(record => record.request.resource === 'H'));
  assert.equal(requests.flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0), 30);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { workerCargoWorld, verifyWorkerCargo };
