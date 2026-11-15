const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { workerMinerWorld } = require('./worker-miner.cjs');
async function workerMinerTravelWorld(server, bot) {
  await workerMinerWorld(server, bot);
  const { db } = await server.world.load();
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await server.world.addRoom('E0N1');
  await server.world.setTerrain('E0N1', new TerrainMatrix());
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'source' });
  await server.world.addRoomObject('E0N1', 'source', 3, 20, { energy: 3000, energyCapacity: 3000 });
  await server.world.addRoomObject('E0N1', 'container', 2, 20,
    { store: { energy: 50, H: 30 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
  const source = await db['rooms.objects'].findOne({ room: 'E0N1', type: 'source' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'build' },
    { $set: { name: source._id, x: 48, y: 20 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 47, y: 22 } });
}
function verifyWorkerMinerTravel(memory, messages) {
  const rows = memory.workerTravel, last = rows.at(-1);
  console.log('WORKER_TRAVEL_SUMMARY ' + JSON.stringify({ first: rows[0], last, rooms: [...new Set(rows.map(row => row.room))] }));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.equal(rows[0].visible, false, 'assigned room starts unseen');
  assert.ok(rows.some(row => row.room === 'E0N1' && row.energy === 50 && row.deposit === 0));
  assert.ok(rows.filter(row => row.visible).every(row => row.hydrogen === 30));
  assert.ok(rows.every(row => row.cargoHydrogen === 0));
  assert.equal(last.room, 'W0N1');
  assert.ok(last.progress > 0, 'worker returns to home controller and upgrades');
}
module.exports = { workerMinerTravelWorld, verifyWorkerMinerTravel };
