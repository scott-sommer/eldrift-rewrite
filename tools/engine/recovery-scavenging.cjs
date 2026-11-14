const assert = require('node:assert/strict');
async function recoveryScavengingWorld(server, bot) {
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 5, downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1', 'storage', 17, 16, {
    user: bot.id, store: {}, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
  await server.world.addRoomObject('W0N1', 'tombstone', 16, 15, {
    user: bot.id, store: { energy: 30, H: 70 }, deathTime: 0, decayTime: 1000,
    creepId: 'lost', creepName: 'lost', creepBody: ['carry'], creepTicksToLive: 0,
  });
  await server.world.addRoomObject('W0N1', 'energy', 17, 15, { resourceType: 'energy', energy: 30 });
  await server.world.addRoomObject('W0N1', 'creep', 16, 16, {
    user: bot.id, name: 'rescuer', body: [{ type: 'carry', hits: 100 }, { type: 'move', hits: 100 }],
    store: {}, storeCapacity: 50, hits: 200, hitsMax: 200, fatigue: 0, ageTime: 1500,
  });
}
function verifyRecoveryScavenging(memory) {
  const rows = memory.recoveryScavenging;
  assert.equal(rows[0].active, true);
  assert.equal(rows[0].stored, 0);
  assert.equal(rows.at(-1).active, false);
  assert.ok(rows.at(-1).stored >= 50);
  assert.equal(rows.at(-1).tombEnergy, 0);
  assert.equal(rows.at(-1).hydrogen, 70, 'recovery preserves hauling capacity for energy');
  assert.equal(rows.at(-1).ground, 0);
  assert.equal(rows.at(-1).storedHydrogen, 0);
  const allRecords = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  const deferred = allRecords.find(record => record.request.id === 'mineral-before-recovery');
  assert.deepEqual(deferred.receipts, []);
  assert.equal(deferred.cancelled, false, 'recovery defers another owner work without cancelling it');
  const records = allRecords.filter(record => record.request.owner !== 'operator:test');
  assert.equal(records.length, 2);
  assert.ok(records.every(record => record.request.resource === 'energy' && record.request.owner.endsWith(':preserve')));
  const delivered = records.flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0);
  assert.equal(delivered, rows.at(-1).stored, 'all recovered storage energy has confirmed delivery evidence');
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
  console.log('SCAVENGING_SUMMARY ' + JSON.stringify({ first: rows[0], last: rows.at(-1), delivered }));
}
module.exports = { recoveryScavengingWorld, verifyRecoveryScavenging };
