const assert = require('node:assert/strict');
async function changeMasterLayout(server, bot, tick) {
  const { db } = await server.world.load();
  if (tick === 80) await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'lab' });
  if (tick === 90) await server.world.addRoomObject('W0N1', 'lab', 21, 20, { user: bot.id,
    store: { GH: 100, energy: 0 }, storeCapacityResource: { GH: 3000, energy: 2000 },
    hits: 500, hitsMax: 500, cooldown: 0 });
}
function verifyMasterLayoutLoss(memory) {
  const rows = memory.upgradeMaster, missing = rows.filter(row => !row.lab);
  const first = missing[0], last = rows.at(-1);
  console.log('MASTER_LAYOUT_LOSS_SUMMARY ' + JSON.stringify({ missing, last, receipts: memory.masterReceipts.totals }));
  assert.equal(missing.length, 10);
  assert.ok(first.master && !first.master.spawning);
  assert.equal(first.master.boostCargo, 200);
  assert.ok(missing.every(row => row.master.name === first.master.name && row.master.x === 22 && row.master.y === 21));
  assert.ok(missing.every(row => row.master.cargo === first.master.cargo));
  assert.equal(missing.at(-1).master.ttl, first.master.ttl - 9, 'no renewal without a valid layout');
  assert.equal(last.master.name, first.master.name, 'same master recovers');
  assert.notEqual(last.labId, rows.find(row => row.labId).labId, 'replacement is a new native identity');
  assert.equal(last.terminal.GH, 140, 'replacement contaminant is cleared by native service');
  assert.equal(last.master.cargo, 0);
  assert.equal(last.terminal.XGH2O, 500, 'held200 mineral is recovered to original300 terminal stock');
  assert.ok(rows.every(row => row.total <= 2 && row.localCargo === 0));
}
module.exports = { changeMasterLayout, verifyMasterLayoutLoss };

async function removeMasterStorage(server, tick) {
  if (tick !== 100) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'storage' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 2 } });
}
function verifyMasterStorageLoss(memory) {
  const rows = memory.upgradeMaster;
  const before = rows.find(row => row.tick === 100), after = rows.find(row => row.tick === 101);
  console.log('MASTER_STORAGE_LOSS_SUMMARY ' + JSON.stringify({ before, after, last: rows.at(-1) }));
  assert.equal(before.master.cargo, 0);
  assert.equal(after.master.name, before.master.name);
  assert.equal(after.master.owner, 'logistics:' + JSON.stringify('W0N1'));
  assert.ok(rows.filter(row => row.tick > 100).every(row => row.master.owner === 'logistics:' + JSON.stringify('W0N1') && row.total === 2));
}
module.exports.removeMasterStorage = removeMasterStorage;
module.exports.verifyMasterStorageLoss = verifyMasterStorageLoss;
