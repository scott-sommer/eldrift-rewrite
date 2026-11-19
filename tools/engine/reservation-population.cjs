const assert = require('node:assert/strict');
const { remoteTransportWorld } = require('./remote-transport.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function reservationPopulationWorld(server,bot) {
  await remoteTransportWorld(server,bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 6,downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 8000 } } });
  for (let index=0; index<20; index++) await server.world.addRoomObject('W0N1','extension',30+index%5,20+Math.floor(index/5),{ user: bot.id,store: { energy: 50 },storeCapacityResource: { energy: 50 },hits: 1000,hitsMax: 1000 });

  const extensions = await db['rooms.objects'].find({ room: 'W0N1',type: 'extension' });
  for (let index=0; index<extensions.length; index++) await db['rooms.objects'].update({ _id: extensions[index]._id },{ $set: { x: 30+index%10*2,y: 10+Math.floor(index/10)*2 } });
}
async function changeReservationPopulation(server,bot,modules,index,mode = 'normal') {
  await server.driver.activateRoom(['W0N1','E0N1']);
  const { db } = await server.world.load();
  if (index === 299) await server.world.addRoomObject('E0N1','creep',15,30,{ name: 'population-threat',user: '2',body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  if (index === 329) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'population-threat' });
  return reloadStampDraft(server,bot,modules,index,mode === 'cancel' ? [20,35] : mode === 'admission' ? [20,60,100] : [20,310,590,860]);
}
function verifyReservationPopulation(memory,evidence) {
  const rows = memory.reservationPopulationRows, last = rows.at(-1), births = memory.reservationBirths;
  evidence.reservationPopulation = { rows,births,reloads: memory.stampReloads };
  assert.equal(rows.length,900); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows[0].units.every(unit => unit.spawning) && rows[0].distributors.every(unit => unit.spawning),'fixture must not seed existing workers');
  assert.ok(rows.some(row => row.distributors.some(unit => unit.spawning)) && rows.some(row => row.units.some(unit => unit.spawning)));
  const names = [...new Set(rows.flatMap(row => row.units.map(unit => unit.name)))]; assert.equal(names.length,2,'one natural reserver replacement must be funded');
  assert.equal(Object.values(births).reduce((sum,cost) => sum+cost,0),2750);
  const first = names[0], original = rows.flatMap(row => row.units.filter(unit => unit.name === first));
  assert.ok(original.some(unit => unit.ttl === 1 && unit.room === 'W0N1' && unit.tasks.length === 0));
  assert.ok(!last.units.some(unit => unit.name === first),'original must expire naturally');
  const successorReady = rows.find(row => row.units.some(unit => unit.name === names[1] && !unit.spawning));
  const originalRetired = rows.find(row => row.units.some(unit => unit.name === first && unit.ttl !== null && unit.ttl <= rows[0].price.retireTicks));
  assert.ok(successorReady.tick < originalRetired.tick,'successor must be ready before quoted retirement');
  const starts = names.map(name => rows.find(row => row.units.some(unit => unit.name === name)).tick);
  assert.equal(starts[1]-starts[0],rows[0].price.replacementTicks,'native birth interval must match recurring service pricing');
  assert.ok(rows.filter(row => row.tick >= 300 && row.tick <= 329).every(row => row.calls.length === 0));
  assert.ok(rows.some(row => row.tick >= 310 && row.tick <= 329 && row.units.some(unit => unit.room === 'W0N1' && !unit.spawning)));
  assert.ok(rows.some(row => row.tick >= 330 && row.calls.some(call => call.code === 0)));
  const buffered = rows.find(row => row.reservation?.ticksToEnd > 5);
  assert.ok(rows.filter(row => row.tick >= buffered.tick && row.tick < 850).every(row => row.reservation?.ticksToEnd > 0),'buffer must cover threat and natural handoff');
  assert.ok(rows.some(row => row.source.capacity === 3000 && row.source.energy === 1500),'capacity must change before regeneration refills stock');
  assert.ok(rows.some(row => row.source.energy === 3000));
  const initial = rows[0].spawnEnergy+rows[0].storage+rows[0].cargo+rows[0].birthCost;
  const unrelated = rows[0].pending.find(request => request.id === 'unrelated-reservation');
  for (const row of rows) {
    assert.equal(row.spawnEnergy+row.storage+row.cargo+row.birthCost,initial,'all births and redistribution must conserve stated home capital');
    assert.deepEqual(row.pending.find(request => request.id === unrelated.id),unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel);
  }
  assert.equal(last.pending.length,1);
  assert.equal(last.revokedAt,850); assert.equal(last.lease,null); assert.ok(last.units.every(unit => unit.room === 'W0N1' && !unit.spawning && unit.tasks.length === 0));
  assert.deepEqual(memory.stampReloads,[21,311,591,861]);
}
function verifyReservationPopulationAdmission(memory,evidence) {
  const rows = memory.reservationPopulationRows;
  evidence.reservationPopulationAdmission = { rows,births: memory.reservationBirths,reloads: memory.stampReloads };
  assert.equal(rows.length,120); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  const initial = rows[0].spawnEnergy+rows[0].storage+rows[0].cargo+rows[0].birthCost;
  for (const row of rows) {
    assert.equal(row.units.length,0); assert.equal(row.calls.length,0); assert.equal(row.reservation,null);
    assert.ok(row.pending.every(request => !request.owner.startsWith('remote-reservation:')),'underfunded stale requests must be cancelled');
    assert.equal(row.source.capacity,1500); assert.equal(row.source.energy,1500);
    assert.equal(row.spawnEnergy+row.storage+row.cargo+row.birthCost,initial);
    assert.deepEqual(row.pending.find(request => request.id === 'unrelated-reservation'),rows[0].pending.find(request => request.id === 'unrelated-reservation'));
    assert.deepEqual(row.sentinel,rows[0].sentinel);
  }
  assert.deepEqual(Object.values(memory.reservationBirths),[150]); assert.deepEqual(memory.stampReloads,[21,61,101]);
}
function verifyReservationPopulationCancellation(memory,evidence) {
  const rows = memory.reservationPopulationRows, last = rows.at(-1);
  evidence.reservationPopulationCancellation = { rows,births: memory.reservationBirths,reloads: memory.stampReloads };
  assert.equal(rows.length,48); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(last.revokedAt > 1 && last.revokedAt < 22); assert.ok(rows.some(row => row.units.some(unit => unit.spawning)));
  assert.ok(rows.every(row => row.calls.length === 0 && row.reservation === null && row.units.every(unit => unit.spawning)));
  assert.equal(last.units.length,0); assert.equal(last.pending.length,1); assert.equal(last.lease,null); assert.equal(last.birthCost,1450);
  const initial = rows[0].spawnEnergy+rows[0].storage+rows[0].cargo+rows[0].birthCost;
  for (const row of rows) {
    assert.equal(row.spawnEnergy+row.storage+row.cargo+row.birthCost,initial,'cancelled birth is spent capital, not a productive worker or refund');
    assert.deepEqual(row.pending.find(request => request.id === 'unrelated-reservation'),rows[0].pending.find(request => request.id === 'unrelated-reservation'));
    assert.deepEqual(row.sentinel,rows[0].sentinel);
  }
  assert.deepEqual(memory.stampReloads,[21,36]);
}
module.exports = { reservationPopulationWorld,changeReservationPopulation,verifyReservationPopulation,verifyReservationPopulationAdmission,verifyReservationPopulationCancellation };
