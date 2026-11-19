const assert = require('node:assert/strict');
const { remoteReservationWorld } = require('./remote-reservation.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function changeReservationQuote(server,bot,modules,index) {
  await server.driver.activateRoom(['W0N1','E0N1']);
  const { db } = await server.world.load();
  if (index === 2) await server.world.addRoomObject('E0N1','creep',35,35,{ name: 'quote-threat',user: '2',body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  if (index === 4) {
    await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'quote-threat' });
    await db['rooms.objects'].update({ room: 'E0N1',type: 'controller' },{ $set: { x: 43 } });
  }
  return reloadStampDraft(server,bot,modules,index,[1,5]);
}
function verifyReservationQuote(memory,evidence) {
  const rows = memory.reservationQuoteRows;
  evidence.reservationQuote = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,8); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.every(row => row.paused.status === 'deferred' && row.pausedUnchanged && row.reservation === null && row.spawnEnergy === 1300));
  for (const row of rows) { assert.deepEqual(row.sourceProgress,rows[0].sourceProgress); assert.deepEqual(row.sentinel,rows[0].sentinel); }
  for (const row of rows.filter(row => [1,2,5,6,7,8].includes(row.tick))) {
    const quote = row.result; assert.equal(quote.status,'quoted'); assert.equal(quote.economics.claims,2); assert.equal(quote.body.cost,1300);
    assert.deepEqual(quote.body.parts,['claim','claim','move','move']); assert.equal(quote.commitment.slots,1);
    assert.equal(quote.commitment.energyPerTick,quote.economics.energyPerTick); assert.equal(quote.travel.profile,'balanced-claim-move');
    assert.ok(quote.economics.usefulBufferTicks >= quote.economics.requiredBufferTicks); assert.ok(quote.economics.timing.replacementTicks < 600);
  }
  assert.equal(rows[0].budget.reason,'body-budget'); assert.equal(rows[0].buffer.reason,'buffer');
  for (const row of rows.filter(row => [3,4].includes(row.tick))) assert.equal(row.result.status,'deferred');
  assert.ok(rows[4].result.travel.outboundTicks > rows[0].result.travel.outboundTicks);
  assert.ok(rows[4].result.economics.energyPerTick > rows[0].result.economics.energyPerTick);
  assert.equal(rows[4].result.controller.position.x,43); assert.ok(rows[4].progress.revision > rows[0].progress.revision);
  assert.deepEqual(memory.stampReloads,[2,6]);
}
module.exports = { reservationQuoteWorld: remoteReservationWorld,changeReservationQuote,verifyReservationQuote };
