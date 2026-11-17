const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function addVisitor(server, bot) {
  await server.world.addRoomObject('E0N1', 'creep', 25, 25, { name: 'intel-visitor', user: bot.id,
    body: [{ type: 'move', hits: 100 }], store: {}, storeCapacity: 0, hits: 100, hitsMax: 100,
    spawning: false, fatigue: 0, ageTime: 1500 });
}
async function intelObservationWorld(server, bot) {
  await server.world.addRoom('E0N1');
  await server.world.setTerrain('E0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'controller' });
  await server.world.addRoomObject('E0N1', 'controller', 20, 20, { user: bot.id, level: 3, progress: 0, downgradeTime: 20000 });
  for (const [x,y] of [[10,10],[35,35]]) await server.world.addRoomObject('E0N1', 'source', x, y, {
    energy: 3000, energyCapacity: 3000, ticksToRegeneration: 300 });
  await server.world.addRoomObject('E0N1', 'mineral', 30, 10, { mineralType: 'H', mineralAmount: 10000, density: 1 });
  await server.world.addRoomObject('E0N1', 'road', 21, 21, { hits: 100, hitsMax: 5000, nextDecayTime: 1000 });
  await addVisitor(server, bot);
}
async function changeIntelVision(server, bot, tick) {
  const { db } = await server.world.load();
  if (tick === 2) await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' },
    { $set: { user: null, level: 0, reservation: { user: bot.id, endTime: Number(await server.world.gameTime) + 20 } } });
  if (tick === 4) await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'creep', name: 'intel-visitor' });
  if (tick === 7) {
    await addVisitor(server, bot);
    await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { reservation: null } });
  }
  if (tick === 9) await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { user: bot.id, level: 1, reservation: null } });
}
function verifyIntelObservation(memory, evidence) {
  evidence.intelObservation = { rows: memory.intelObservation, reloads: memory.stampReloads,
    record: memory.eldrift.records['intel/E0N1'], unrelated: memory.intelUnrelated,
    planning: memory.eldrift.records['planning/E0N1'] };
  const rows = memory.intelObservation, last = rows.at(-1), record = memory.eldrift.records['intel/E0N1'];
  console.log('INTEL_OBSERVATION ' + JSON.stringify(rows));
  assert.equal(rows.length, 12);
  assert.deepEqual(memory.stampReloads, [7]);
  assert.ok(rows.slice(0,2).every(row => row.owned && row.level === 3 && row.owner));
  assert.ok(rows.slice(2,4).every(row => !row.owned && row.owner === null && row.reservation));
  const absent = rows.filter(row => row.tick >= 5 && row.tick <= 7);
  assert.equal(absent.length, 3);
  assert.ok(absent.every(row => !row.liveVisible && row.lastSeen === 4 && row.lastVisit === 4 && row.sources === 2));
  assert.deepEqual(absent.map(row => row.freshness), ['fresh','fresh','stale']);
  assert.ok(rows.slice(7,9).every(row => row.liveVisible && row.owner === null && row.reservation === null));
  assert.ok(rows.slice(9).every(row => row.owned && row.level === 1 && row.reservation === null));
  assert.ok(rows.every(row => row.sources === 2 && row.mineral === 'H' && row.highway && !row.keeper));
  assert.ok(rows.every(row => row.homeSeen === row.tick && row.homeOwned));
  assert.equal(record.owner, 'intel');
  assert.equal(record.version, 2);
  assert.equal(last.lastSeen, 12);
  assert.equal(last.lastVisit, 12);
  assert.ok(record.data.summary.exits.some(exit => exit.direction === 7 && exit.room === 'W0N1'));
  assert.deepEqual(record.data.summary.sources.map(source => source.capacity), [3000,3000]);
  assert.equal(record.data.summary.structures.filter(item => item.type === 'road').length, 1);
  assert.ok(!record.data.structureIds.includes(record.data.summary.controller.id));
  assert.equal(memory.intelUnrelated.initializedAt, 1);
  assert.equal(JSON.stringify(memory.eldrift.records['planning/E0N1']), memory.intelUnrelated.planning);
}
module.exports = { intelObservationWorld, changeIntelVision, verifyIntelObservation };
