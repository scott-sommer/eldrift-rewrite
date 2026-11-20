const assert = require('node:assert/strict');
const { boostWorld } = require('./boosts.cjs');
async function boostRoleWorld(server,bot) {
  await boostWorld(server,bot,'coexist'); const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 100000,XGH2O: 120,ZO: 30 } } });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'lab',x: 17,y: 20 },{ $set: { store: { K: 10 },storeCapacityResource: { K: 3000,energy: 2000 } } });
}
function verifyBoostRoles(memory,mode,evidence) {
  const rows = memory.boostRoleRows, last = rows.at(-1), records = memory.eldrift.records, state = records['industry-boost-labs/W0N1'];
  evidence.boostRoles = { mode,rows,state };
  assert.equal(rows.length,320); assert.equal(state.owner,'industry'); assert.equal(state.version,1);
  const roleLab = state.data.roles[0]?.lab ?? memory.eldrift.records['operator/config'].data.rooms.W0N1.override.labBoostRoles[0]?.lab;
  if (roleLab) assert.ok(rows.every(row => !row.reactionLabs.includes(roleLab)),'Configured role lab cannot react');
  assert.equal(last.bankOH,10); assert.equal(last.bankK,10); assert.equal(last.cargo,0);
  assert.equal(records['tasks/boost-courier'].data.queue.length,0); assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 320).length,0);
  if (mode === 'normal') {
    assert.ok(rows.some(row => row.mineral === 'XGH2O' && row.amount === 60 && row.energy >= 40 && !row.ready),'Role preloads before the actor requests it');
    assert.equal(last.work,2); assert.equal(last.ready,true); assert.equal(last.mineral,'XGH2O'); assert.equal(last.amount,60); assert.ok(last.energy >= 40); assert.equal(last.bankX,0);
  } else {
    assert.equal(memory.boostRoleChanged,true); assert.equal(last.work,0); assert.equal(last.ready,false);
    assert.ok(rows.some(row => row.desired !== 'XGH2O' && row.bound === 'XGH2O' && row.cargoX > 0),'Retiring role must survive admitted cargo');
    if (mode === 'switch') { assert.equal(last.bound,'ZO'); assert.equal(last.mineral,'ZO'); assert.equal(last.amount,30); assert.equal(last.bankX,120); }
    else { assert.equal(state.data.roles.length,0); assert.equal(last.bound,null); assert.equal(last.bankX+(last.mineral === 'XGH2O' ? last.amount : 0),120); }
  }
}
module.exports = { boostRoleWorld,verifyBoostRoles };
