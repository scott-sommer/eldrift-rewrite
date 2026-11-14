const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function upgradeServiceWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6, downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1', 'storage', 17, 16, { user: bot.id, store: { H: 20, energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  await server.world.addRoomObject('W0N1', 'terminal', 18, 16, { user: bot.id, store: { XGH2O: 1500, energy: 100 }, storeCapacity: 300000, hits: 10000, hitsMax: 10000, cooldown: 0 });
  await server.world.addRoomObject('W0N1', 'lab', 17, 15, { user: bot.id, store: { GH: 40, energy: 0 }, storeCapacityResource: { GH: 3000, energy: 2000 }, hits: 500, hitsMax: 500, cooldown: 0 });
  await server.world.addRoomObject('W0N1', 'creep', 16, 16, { user: bot.id, name: 'service', body: ['carry', 'move'].map(type => ({ type, hits: 100 })),
    store: {}, storeCapacity: 50, hits: 200, hitsMax: 200, fatigue: 0, ageTime: 1500 });
}
function verifyUpgradeService(memory) {
  const rows = memory.upgradeService; const last = rows.at(-1);
  console.log('UPGRADE_SERVICE_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.equal(last.storageH, 0);
  assert.deepEqual(last.terminal, { H: 20, GH: 40, XGH2O: 200, energy: 0 });
  assert.deepEqual(last.lab, { mineral: 'XGH2O', amount: 1300, energy: 100 });
  assert.equal(last.cargo, 0);
  assert.ok(rows.some(row => row.lab.amount === 0), 'old mineral is cleared before switching');
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.deepEqual(memory.upgradeServiceReceipts.totals, { H: 20, GH: 40, XGH2O: 1300, energy: 100 });
  const totals = {};
  for (const record of records) for (const receipt of record.receipts) totals[record.request.resource] = (totals[record.request.resource] ?? 0) + receipt.amount;
  // The request queue prunes expired receipts; retained records still prove the final energy stage.
  assert.equal(totals.energy, 100);
  assert.ok(records.every(record => record.request.owner === 'upgrade-service:W0N1'));
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
  assert.deepEqual(memory.eldrift.records['tasks/service'].data.queue, []);
}
module.exports = { upgradeServiceWorld, verifyUpgradeService };
