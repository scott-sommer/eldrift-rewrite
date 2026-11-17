const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function workerPositionWorld(server, bot, wide) {
  const { db } = await server.world.load();
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' },
    { $set: { x: 20, y: 20, level: 2, progress: 0, downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1', 'creep', 17, 20, {
    name: wide ? 'position-wide' : 'position', user: bot.id,
    body: ['work','carry','move'].map(type => ({ type, hits: 100 })), store: { energy: 20 },
    storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyWorkerPosition(memory, wide) {
  const rows = memory.workerPosition;
  console.log('WORKER_POSITION ' + JSON.stringify(rows));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.range), wide ? [3,3,3] : [3,2,2]);
  assert.deepEqual(rows.map(row => row.progress), [0,1,2], 'positioning must preserve the first accepted upgrade');
  assert.deepEqual(rows.map(row => row.energy), [20,19,18]);
}
module.exports = { workerPositionWorld, verifyWorkerPosition };
