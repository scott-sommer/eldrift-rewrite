const assert = require('node:assert/strict');
const { remoteAssessmentWorld } = require('./remote-assessment.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function roomReservationWorld(server,bot) {
  await remoteAssessmentWorld(server,bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 4,downgradeTime: 20000 } });
  for (let n=0; n<15; n++) await server.world.addRoomObject('W0N1','extension',20+n%5,21+Math.floor(n/5),{ user: bot.id,store: { energy: 50 },storeCapacityResource: { energy: 50 },hits: 1000,hitsMax: 1000 });
  for (const type of ['source','controller']) await db['rooms.objects'].removeWhere({ room: 'W0N2',type });
  await server.world.addRoomObject('W0N2','source',25,45,{ energy: 1500,energyCapacity: 1500,ticksToRegeneration: 300 });
  await server.world.addRoomObject('W0N2','controller',20,20,{ user: null,level: 0 });
  await server.world.addRoomObject('W0N2','creep',25,40,{ name: 'north-reservation-witness',user: bot.id,body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
}
async function changeRoomReservation(server,bot,modules,index) {
  await server.driver.activateRoom(['W0N1','E0N1','W0N2']); const { db } = await server.world.load();
  if (index === 10 || index === 14) await db['rooms.objects'].update({ room: 'E0N1',type: 'controller' },{ $set: { x: index === 10 ? 21 : 20 } });
  return reloadStampDraft(server,bot,modules,index,[1,7,17]);
}
function verifyRoomReservation(memory,evidence) {
  const rows = memory.roomReservationRows, last = rows.at(-1);
  evidence.roomReservation = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,28); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.some(row => row.tick < 7 && row.east?.plan.reserve && row.north?.plan.reserve === null),'one room must be quoted Reserve and the other explicitly unreserved');
  const migration = rows.find(row => row.tick === 7); assert.equal(migration.beforeVersion,2); assert.equal(migration.version,3);
  assert.equal(migration.east.generation,rows.find(row => row.tick === 6).east.generation);
  const changed = rows.filter(row => row.tick >= 11 && row.tick <= 14), committed = changed.filter(row => row.status === 'applied');
  assert.ok(committed.length > 0 && committed.every(row => row.east === null),'commit must refuse a stale controller quote');
  for (const row of changed.filter(row => row.status === 'scanning')) assert.deepEqual(row.east,rows[row.tick-2].east,'pending scans must not renew or republish a stale lease');
  assert.ok(rows.some(row => row.tick >= 15 && row.east?.plan.reserve));
  assert.ok(last.east?.plan.reserve); assert.equal(last.north.plan.reserve,null); assert.equal(last.version,3);
  for (const row of rows) {
    assert.deepEqual(row.manual,rows[0].manual); assert.deepEqual(row.sentinel,rows[0].sentinel); assert.equal(row.spawnEnergy,1300); assert.equal(row.reservation,null);
    for (const offer of row.offers) for (const quote of offer.quotes) { assert.equal(quote.assessment.policy.reservation.energyPerTick,0); assert.equal(quote.assessment.sourceFacts.capacity,1500); }
  }
  const east = last.offers.find(offer => offer.room === 'E0N1'); assert.equal(east.quotes.length,2); assert.equal(last.offers.find(offer => offer.room === 'W0N2').quotes.length,1); assert.ok(east.reservation); assert.equal(east.commitment.energyPerTick,east.reservation.quote.economics.energyPerTick);
  assert.equal(east.reservation.quote.observedAt,18); assert.equal(last.offers.find(offer => offer.room === 'W0N2').reservation,null);
  assert.deepEqual(memory.stampReloads,[2,8,18]);
}
module.exports = { roomReservationWorld,changeRoomReservation,verifyRoomReservation };
