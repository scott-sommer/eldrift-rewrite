const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { workSelectionWorld } = require('./work-selection.cjs');
async function workerPopulationWorld(server, bot) {
  await workSelectionWorld(server, bot);
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'creep' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 19, y: 21, store: { energy: 300 } } });
  await server.world.addRoomObject('W0N1', 'container', 18, 21, {
    store: { energy: 1000 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
}
async function loseWorker(server, tick) {
  if (tick !== 22) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'creep' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { store: { energy: 300 } } });
}
function verifyWorkerPopulation(memory) {
  const rows = memory.workerPopulation;
  const names = [...new Set(rows.flatMap(row => row.names))];
  assert.equal(names.length, 2, 'one initial worker and one replacement');
  assert.ok(rows.every(row => row.names.length <= 1), 'no redundant worker spawning');
  assert.ok(rows.flatMap(row => row.owners).every(owner => owner === 'work:W0N1:builder'));
  assert.ok(rows[21].progress > 0, 'initial spawned worker replenishes, builds, repairs and upgrades');
  assert.equal(rows.at(-1).ready, 1);
  assert.equal(rows.at(-1).sites, 0);
  assert.ok(rows.at(-1).energy <= 900, 'both workers withdraw their own working energy');
  assert.ok(rows.at(-1).progress > rows[22].progress, 'replacement resumes upgrading');
  assert.deepEqual(memory.eldrift.records['spawning/W0N1'].data.requests, []);
  assert.deepEqual(memory.eldrift.records['tasks/' + names[0]].data.queue, []);
}
module.exports = { workerPopulationWorld, loseWorker, verifyWorkerPopulation };
