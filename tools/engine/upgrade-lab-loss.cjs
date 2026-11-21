const assert = require('node:assert/strict');
async function changeUpgradeLabLoss(server,bot,index,evidence) {
  const { db } = await server.world.load();
  if (index === 3) {
    const lab = (await db['rooms.objects'].find({ room: 'W0N1',type: 'lab' }))[0];
    evidence.specialistLabLoss = { afterTick: index,oldLab: lab._id,lostStock: lab.store };
    await db['rooms.objects'].removeWhere({ _id: lab._id });
  }
  if (index === 7) {
    await server.world.addRoomObject('W0N1','lab',22,20,{ user: bot.id,store: { XGH2O: 1260,energy: 840 },storeCapacityResource: { XGH2O: 3000,energy: 2000 },hits: 500,hitsMax: 500,cooldown: 0 });
    evidence.specialistLabLoss.replacementAfterTick = index;
  }
}
function verifyUpgradeLabLoss(rows,event,records) {
  assert.ok(event && event.oldLab); assert.notEqual(rows.at(-1).boostLab,event.oldLab);
  assert.ok(rows.some(row => row.boostLab === null),'Specialist observes absence rather than stale lab identity');
  assert.ok(rows.every(row => row.generic.boosted === 0 && row.generic.status !== 'confirmed'),'Lost lab must not grant generic boost credit');
  assert.ok(rows.some(row => row.generic.lab === event.oldLab && row.generic.status === 'pending'));
  assert.equal(rows.at(-1).generic.status,'failed'); assert.equal(rows.at(-1).generic.reason,'lab-lost');
  assert.equal(rows.at(-1).generic.acknowledged,true); assert.equal(rows.at(-1).generic.lab,null);
  assert.equal(rows.at(-1).units[6].boost,42,'Replacement lab restores specialist boost cycle');
  assert.ok(!records['quantity-reservations/empire'].data.claims.some(claim => claim.owner.startsWith('boost:')));
  assert.equal(rows.at(-1).labs.find(lab => lab.id === rows.at(-1).boostLab).amount,0);
  assert.equal(rows.at(-1).labs.find(lab => lab.id === rows.at(-1).boostLab).energy,0);
}
module.exports = { changeUpgradeLabLoss,verifyUpgradeLabLoss };
