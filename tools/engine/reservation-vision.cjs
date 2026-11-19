const assert = require('node:assert/strict');
const { reservationPopulationWorld } = require('./reservation-population.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function changeReservationVision(server,bot,modules,index) {
  await server.driver.activateRoom(['W0N1','E0N1']);
  const { db } = await server.world.load();
  if (index === 299) await server.world.addRoomObject('E0N1','creep',15,30,{ name: 'vision-threat',user: '2',body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  if (index === 399) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'vision-threat' });
  return reloadStampDraft(server,bot,modules,index,[20,270,350,410,490]);
}
function verifyReservationVision(memory,evidence) {
  const rows = memory.pipelineRows, last = rows.at(-1), births = memory.pipelineBirths;
  evidence.reservationVision = { rows,births,reloads: memory.stampReloads };
  assert.equal(rows.length,550); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.some(row => row.tick < 200 && row.probe.calls.some(call => call.code === 0)));
  const hidden = rows.filter(row => row.tick >= 270 && row.tick < 330);
  assert.ok(hidden.every(row => !row.visible && row.probe.sensorRoom === 'W0N1' && row.lease === null && row.remotePending === 0 && row.probe.calls.length === 0));
  assert.ok(hidden.every(row => row.probe.retained && row.tick-row.probe.retained.observedAt > 20 && row.probe.retained.sources.length > 0),'absence of vision retains old facts rather than inventing empty observations');
  assert.ok(hidden[0].probe.retained.reservation,'expired observations must retain the formerly self-reserved controller fact');
  assert.ok(hidden.every(row => row.units.filter(unit => unit.family === 'reserver').every(unit => unit.room === 'W0N1' && !unit.spawning && unit.tasks === 0)));
  assert.ok(hidden.every(row => JSON.stringify(row.probe.retained) === JSON.stringify(hidden[0].probe.retained)));
  const hostile = rows.filter(row => row.tick >= 330 && row.tick < 400 && row.visible);
  assert.ok(hostile.length > 0); assert.ok(hostile.every(row => row.probe.retained.foreignUnits > 0 && row.probe.retained.observedAt >= 330)); assert.ok(hostile.every(row => row.probe.calls.length === 0 && !row.lease?.reserve && row.remotePending === 0));
  assert.ok(rows.some(row => row.tick >= 400 && row.tick < 470 && row.probe.calls.some(call => call.code === 0)),'fresh safe observations must restore service');
  const recovered = rows.filter(row => row.tick >= 400 && row.tick < 470 && row.probe.calls.some(call => call.code === 0));
  assert.ok(recovered.every(row => row.probe.binding.generation === row.lease.generation && row.probe.binding.generation > rows.find(item => item.lease?.reserve).lease.generation));
  assert.equal(Object.values(births).filter(birth => birth.family === 'reserver').length,1,'returned healthy reserver must adopt fresh authority without a second birth');
  assert.ok(rows.some(row => row.tick >= 400 && row.lease?.reserve && row.lease.generation !== rows.find(item => item.lease?.reserve).lease.generation));
  assert.equal(last.lease,null); assert.equal(last.remotePending,0); assert.equal(last.quantityClaims,0); assert.equal(last.miningClaims,0);
  assert.ok(last.units.filter(unit => unit.family === 'reserver').every(unit => unit.room === 'W0N1' && !unit.spawning && unit.tasks === 0));
  const initial = rows[0].homeEnergy+rows[0].units.reduce((sum,unit) => sum+unit.cargo,0)+rows[0].birthCost;
  for (const row of rows) {
    assert.equal(row.income,0); assert.equal(row.homeEnergy+row.units.reduce((sum,unit) => sum+unit.cargo,0)+row.birthCost,initial);
    assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel);
  }
  assert.deepEqual(memory.stampReloads,[21,271,351,411,491]);
}
module.exports = { reservationVisionWorld: reservationPopulationWorld,changeReservationVision,verifyReservationVision };
