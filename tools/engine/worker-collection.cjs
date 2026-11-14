const assert = require('node:assert/strict');
const { workSelectionWorld } = require('./work-selection.cjs');
async function workerCollectionWorld(server, bot) {
  await workSelectionWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'build' }, { $set: { store: { energy: 0 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 4 } });
  await server.world.addRoomObject('W0N1', 'storage', 19, 22, {
    user: bot.id, store: { energy: 50005 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
  await server.world.addRoomObject('W0N1', 'container', 20, 21, {
    store: { energy: 5 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
}
function verifyWorkerCollection(memory) {
  const rows = memory.workerCollection;
  assert.deepEqual(rows.map(row => row.energy), [0, 5, 10, 5, 4, 3, 2, 1, 0, 0]);
  assert.deepEqual(rows.map(row => row.storage), [50005, ...Array(9).fill(50000)]);
  assert.deepEqual(rows.map(row => row.container), [5, 5, ...Array(8).fill(0)]);
  assert.deepEqual(rows.map(row => row.progress), [0, 0, 0, 0, 0, 1, 2, 3, 4, 4]);
  assert.deepEqual(rows.map(row => row.sites), [1, 1, 1, ...Array(7).fill(0)]);
  assert.deepEqual(rows.map(row => row.phase), ['collect', 'collect', ...Array(6).fill('work'), 'collect', 'collect']);
}
module.exports = { workerCollectionWorld, verifyWorkerCollection };
