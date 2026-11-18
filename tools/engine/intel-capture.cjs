const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { intelObservationWorld, changeIntelVision } = require('./intel-observation.cjs');
async function intelCaptureWorld(server, bot) {
  await intelObservationWorld(server, bot);
  await server.world.addRoom('W1N1');
  await server.world.setTerrain('W1N1', new TerrainMatrix());
  await server.world.addRoomObject('W1N1', 'creep', 25, 25, { name: 'capture-visitor', user: bot.id,
    body: [{ type: 'move', hits: 100 }], store: {}, storeCapacity: 0, hits: 100, hitsMax: 100,
    spawning: false, fatigue: 0, ageTime: 1500 });
}
function verifyIntelCapture(memory, evidence) {
  const rows = memory.intelCaptureRows;
  evidence.intelCapture = { rows, reloads: memory.stampReloads, sentinel: memory.intelCaptureSentinel,
    records: Object.fromEntries(Object.entries(memory.eldrift.records).filter(([key]) => key.startsWith('intel/'))),
    progress: memory.eldrift.records['intel-capture/empire'] };
  console.log('INTEL_CAPTURE ' + JSON.stringify(rows));
  assert.equal(rows.length, 18);
  assert.deepEqual(memory.stampReloads, [7]);
  assert.equal(memory.intelCaptureSentinel.initializedAt, 1);
  for (const row of rows) {
    assert.ok(row.updated.length <= 1, 'capture cap must apply across all rooms');
    assert.ok(row.rooms.every(room => room.lastVisit === null), 'automatic capture cannot imply a physical visit');
    for (const [index, room] of row.rooms.entries()) {
      if (!room.visible) assert.equal(room.lastSeen, row.before[index], 'vision loss must not create an empty observation');
    }
    if (row.tick === 4) {
      assert.deepEqual(row.updated, []);
      assert.deepEqual(row.cursor, row.beforeCursor, 'zero budget cannot move the cursor');
    }
  }
  const active = rows.filter(row => row.updated.length);
  assert.ok(active.length >= 10, 'default CPU budget must make sustained progress');
  for (const room of ['E0N1','W0N1','W1N1']) {
    assert.ok(active.some(row => row.updated.includes(room) && row.tick < 7), 'all rooms need service before reload');
    assert.ok(active.some(row => row.updated.includes(room) && row.tick > 7), 'all rooms need service after reload');
  }
  const afterReload = rows.find(row => row.tick === 7);
  assert.deepEqual(afterReload.beforeCursor, rows.find(row => row.tick === 6).cursor, 'reload must restore persisted rotation');
  assert.ok(rows.filter(row => row.tick >= 5 && row.tick <= 7).every(row => !row.rooms[0].visible));
  assert.ok(rows.some(row => row.tick > 10 && row.rooms[0].owner && row.rooms[0].sources === 2));
  const final = rows.at(-1);
  assert.ok(final.rooms.every(room => room.lastSeen !== null && room.lastSeen >= 15));
}
module.exports = { intelCaptureWorld, changeIntelVision, verifyIntelCapture };
