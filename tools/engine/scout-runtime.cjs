const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { intelObservationWorld } = require('./intel-observation.cjs');
async function scoutRuntimeWorld(server, bot, automatic, blocked = false, exploratory = false) {
  await intelObservationWorld(server,bot);
  await server.world.setTerrain('W0N1',new TerrainMatrix());
  if (exploratory) await scoutTerrainHalo(server);
  const { db } = await server.world.load();
  if (automatic) await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' },{ $set: { level: 2, downgradeTime: 20000 } });
  await db['rooms.objects'].removeWhere({ name: 'intel-visitor', room: 'E0N1' });
  await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' },{ $set: { user: null, level: 0 } });
  if (blocked) await blockedExitWorld(server,bot);
  if (!automatic) await server.world.addRoomObject('W0N1','creep',46,25,{ name: 'rewrite-scout', user: bot.id,
    body: [{ type: 'move', hits: 100 }], store: {}, storeCapacity: 0, hits: 100, hitsMax: 100,
    spawning: false, fatigue: 0, ageTime: 1500 });
}
async function changeScoutRuntime(server, index, automatic, blocked = false) {
  if (automatic || blocked || index !== 12) return;
  await server.world.addRoomObject('E0N1','creep',8,25,{ name: 'static-threat', user: '2',
    body: [{ type: 'move', hits: 100 },{ type: 'attack', hits: 100 }], store: {}, storeCapacity: 0,
    hits: 200, hitsMax: 200, spawning: false, fatigue: 0, ageTime: 1500 });
}
function verifyScoutRuntime(memory,evidence,automatic,exploratory = false,blocked = false) {
  const rows = memory.scoutRuntimeRows, last = rows.at(-1);
  evidence.scoutRuntime = { automatic, exploratory, blocked, rows, death: memory.scoutRuntimeDeath, reloads: memory.stampReloads,
    sentinel: memory.eldrift.records['sentinel/scout'], witness: memory.scoutRuntimeWitness };
  console.log('SCOUT_RUNTIME ' + JSON.stringify({ automatic, rows: rows.length, last }));
  assert.deepEqual(evidence.messages,[],'scout execution must not hide reported unit errors');
  assert.equal(rows.length,blocked ? 64 : automatic ? 110 : 32);
  assert.deepEqual(memory.stampReloads,automatic ? [31] : [9]);
  assert.ok(rows.some(row => blocked ? row.alternateVisit !== null : row.lastVisit !== null),'native scout must mark an actual physical visit');
  for (const row of rows.filter(row => row.lastVisit === row.tick)) {
    const unit = row.units.find(unit => unit.room === 'E0N1');
    assert.ok(unit && unit.x > 0 && unit.x < 49 && unit.y > 0 && unit.y < 49,'visits require an interior scout');
    const control = row.controls.find(control => control.id === unit.id);
    assert.ok(row.tick > control.enteredAt,'entry stabilization cannot be skipped');
  }
  assert.ok(rows.every(row => row.units.length <= 1 && row.pending <= 1),'scout demand must not overfill');
  assert.equal(JSON.stringify(memory.eldrift.records['sentinel/scout']),memory.scoutRuntimeWitness);
  if (blocked) verifyBlocked(rows,last);
  else if (exploratory) {
    assert.ok(rows.some(row => row.units.some(unit => unit.spawning)),'unknown frontier must recruit through shared spawning');
    assert.ok(rows.some(row => row.lastVisit !== null && row.controls.some(control => control.objective && control.objective !== 'E0N1')),'fresh visited intel must move exploration to another frontier');
    assert.ok(last.controls.every(control => control.assigned.length === 0),'fallback exploration cannot depend on an assigned list');
    assert.ok(last.units.length === 1 && last.losses.length === 0);
  }
  else if (automatic) verifyReplacement(rows,last,memory.scoutRuntimeDeath);
  else {
    assert.ok(rows.some(row => row.tick >= 13 && row.controls.some(control => control.phase === 'evade')),'threat must interrupt idle scouting');
    assert.ok(rows.filter(row => row.tick >= 13).flatMap(row => row.units).filter(unit => unit.room === 'E0N1')
      .every(unit => Math.max(Math.abs(unit.x-8),Math.abs(unit.y-25)) > 5),'escape must respect threat overlay');
    assert.equal(last.units[0].room,'W0N1');
    assert.ok(last.controls[0].avoidUntil.E0N1 > last.tick,'hostile room must remain temporarily excluded');
    assert.ok(rows.find(row => row.tick === 12).lastVisit < 13,'visit must complete before hostile injection');
  }
}
function verifyReplacement(rows,last,death) {
  assert.equal(death.result,0);
  assert.equal(death.tick,20);
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)),'ordinary shared queue must actually spawn scouts');
  assert.equal(last.units.length,1);
  assert.notEqual(last.units[0].id,death.id);
  assert.equal(last.units[0].room,'E0N1');
  assert.ok(last.lastVisit > 20,'replacement must finish the uncompleted visit');
  assert.ok(last.losses.some(loss => loss.id === death.id && loss.kind === 'early-disappearance' && !loss.failurePending));
  assert.ok(!last.controls.some(control => control.id === death.id),'dead control state must retire');
}
module.exports = { scoutRuntimeWorld, changeScoutRuntime, verifyScoutRuntime };

async function blockedExitWorld(server,bot) {
  const terrain = new TerrainMatrix();
  for (let x = 0; x < 50; x++) for (let y = 0; y < 50; y++) if (y !== 25) terrain.set(x,y,'wall');
  await server.world.setTerrain('E0N1',terrain);
  await server.world.addRoomObject('E0N1','rampart',1,25,{ user: '2', isPublic: false, hits: 100000, hitsMax: 100000 });
  await server.world.addRoomObject('E0N1','creep',20,25,{ name: 'vision-witness', user: bot.id,
    body: [{ type: 'move', hits: 100 }], store: {}, storeCapacity: 0, hits: 100, hitsMax: 100,
    spawning: false, fatigue: 0, ageTime: 1500 });
  await server.world.addRoom('W0N2');
  await server.world.setTerrain('W0N2',new TerrainMatrix());
}
function verifyBlocked(rows,last) {
  assert.ok(rows.every(row => row.lastVisit === null),'a blocked private rampart cannot create a physical visit');
  assert.ok(rows.every(row => row.units.every(unit => unit.room !== 'E0N1')));
  assert.equal(last.units[0].room,'W0N2');
  assert.ok(last.alternateVisit !== null,'route recovery must progress to the next assigned room');
  assert.equal(last.controls[0].assignmentIndex,2);
  assert.ok(last.controls[0].avoidUntil.E0N1 > last.tick);
}

async function scoutTerrainHalo(server) {
  // The native finder loads terrain before asking roomCallback to reject a room.
  for (let x = -4; x <= 2; x++) {
    for (let y = -5; y <= 1; y++) {
      const room = `${x < 0 ? 'W'+(-x-1) : 'E'+x}${y < 0 ? 'N'+(-y-1) : 'S'+y}`;
      if (room === 'W0N1' || room === 'E0N1') continue;
      await server.world.addRoom(room);
      await server.world.setTerrain(room,new TerrainMatrix());
    }
  }
}
