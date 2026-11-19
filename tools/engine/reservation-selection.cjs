const assert = require('node:assert/strict');
const { roomReservationWorld } = require('./room-reservation.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function changeReservationSelection(server,bot,modules,index) {
  await server.driver.activateRoom(['W0N1','E0N1','W0N2']);
  return reloadStampDraft(server,bot,modules,index,[2,8,22]);
}
function verifyReservationSelection(memory,evidence) {
  const rows = memory.reservationSelectionRows;
  evidence.reservationSelection = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,32); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.filter(row => row.tick < 5).every(row => row.prices.every(price => price.quote === null)));
  assert.ok(rows.some(row => row.tick >= 6 && row.tick <= 20 && row.prices.every(price => price.quote?.body.cost === 1300)));
  assert.ok(rows.some(row => row.tick >= 6 && row.tick <= 20 && row.leases.every(lease => lease?.plan.reserve)));
  for (const row of rows.filter(row => !row.enabled)) { assert.equal(row.revision,row.beforeRevision); assert.ok(row.prices.every(price => price.quote === null)); }
  assert.ok(rows.filter(row => row.tick >= 25).some(row => row.leases.every(lease => lease?.plan.reserve)));
  const first = rows.find(row => row.tick >= 6 && row.prices.every(price => price.quote));
  for (const row of rows.filter(row => row.tick > first.tick && row.tick <= 20)) assert.deepEqual(row.prices,first.prices,'equivalent refresh must preserve management price identity');
  for (const row of rows) {
    assert.equal(row.spawnEnergy,1300); assert.equal(row.reservation,null); assert.deepEqual(row.sentinel,rows[0].sentinel);
    for (const offer of row.offers) { assert.ok(offer.capacity.every(capacity => capacity === 1500)); assert.ok(offer.fees.every(fee => fee.energyPerTick === 0 && fee.spawnLoad === 0)); }
  }
  assert.equal(rows.find(row => row.tick === 9).beforeCacheVersion,1);
  assert.ok(rows.some(row => row.tick >= 9 && row.cacheVersion === 2));
  assert.equal(rows.at(-1).cacheVersion,2);
  assert.deepEqual(memory.stampReloads,[3,9,23]);
}
module.exports = { reservationSelectionWorld: roomReservationWorld,changeReservationSelection,verifyReservationSelection };
