const assert = require('node:assert/strict');
async function specialistRoleWorld(server,bot) {
  const { db } = await server.world.load(), labs = (await db['rooms.objects'].find({ room: 'W0N1',type: 'lab' })).sort((a,b) => a._id.localeCompare(b._id));
  const values = [[17,20,'K',10],[16,21,'H',10],[18,21,'O',10],[17,22,null,0]];
  for (const [index,lab] of labs.entries()) {
    const [x,y,resource,amount] = values[index];
    await db['rooms.objects'].update({ _id: lab._id },{ $set: { x,y,store: resource ? { [resource]: amount } : {},storeCapacityResource: { energy: 2000,...(resource ? { [resource]: 3000 } : {}) },storeCapacity: resource ? null : 5000 } });
  }
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 100000,XGH2O: 120,ZO: 60 } } });
}
function verifySpecialistRole(memory,evidence) {
  const rows = memory.boostRoleRows, change = memory.specialistRoleChange, last = rows.at(-1);
  evidence.boostRoles.specialistChange = change; evidence.boostRoles.specialistReload = evidence.specialistRoleReload;
  assert.ok(change.cargo > 0); assert.equal(change.correctedAt,change.tick+30); assert.equal(evidence.specialistRoleReload.pending,true);
  const waiting = rows.filter(row => row.tick >= change.tick && row.tick < change.correctedAt);
  assert.ok(waiting.every(row => row.specialist && row.desired === 'ZO'));
  assert.ok(waiting.some(row => row.bound === 'ZO' && row.cargoZO > 0),'Retiring role retains actual admitted cargo');
  const released = waiting.find(row => row.bound === null); assert.ok(released);
  assert.ok(released.receipts >= change.receipts+change.cargo,'Binding cannot release before admitted delivery credit');
  assert.ok(waiting.every(row => row.amount+row.cargoZO <= change.cargo),'No additional incompatible refill may be admitted');
  assert.ok(rows.every(row => row.bankZO+row.cargoZO+(row.mineral === 'ZO' ? row.amount : 0) === 60),'Internal supply conserves ZO stock');
  assert.equal(last.bound,'XGH2O'); assert.equal(last.desired,'XGH2O'); assert.equal(last.mineral,'XGH2O'); assert.equal(last.amount,60); assert.equal(last.energy,40);
  assert.equal(last.bankZO,60); assert.equal(last.bankX,60); assert.equal(last.work,0); assert.equal(last.ready,false);
  assert.equal(memory.eldrift.records['operator/config'].data.empire.upgradeRoomEnabled,true);
}
module.exports = { specialistRoleWorld,verifySpecialistRole };
