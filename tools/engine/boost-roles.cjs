const { specialistRoleWorld,verifySpecialistRole } = require('./boost-role-specialist.cjs');
const assert = require('node:assert/strict');
const { boostWorld } = require('./boosts.cjs');
async function boostRoleWorld(server,bot,mode) {
  await boostWorld(server,bot,'coexist'); const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 100000,XGH2O: 120,ZO: 30 } } });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'lab',x: 17,y: 20 },{ $set: { store: { K: 10 },storeCapacityResource: { K: 3000,energy: 2000 } } });
  if (mode === 'specialist') await specialistRoleWorld(server,bot);
}
function verifyBoostRoles(memory,mode,evidence) {
  const rows = memory.boostRoleRows, last = rows.at(-1), records = memory.eldrift.records, state = records['industry-boost-labs/W0N1'] ?? null;
  evidence.boostRoles = { mode,rows,state,allocation: memory.boostRoleAllocation,reloads: memory.stampReloads };
  assert.deepEqual(memory.stampReloads,mode === 'specialist' ? [...new Set([8,12,31,181,evidence.specialistRoleReload.tick])].sort((a,b) => a-b) : [8,12,31,181]);
  assert.equal(rows.length,320);
  const roleLab = rows[0].lab;
  assert.ok(rows.filter(row => row.bound || row.desired).every(row => !row.reactionLabs.includes(roleLab)),'Active or retiring role lab cannot react');
  assert.equal(last.bankOH,10); assert.equal(last.bankK,10); assert.equal(last.cargo,0);
  assert.equal(records['tasks/boost-courier'].data.queue.length,0); assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 320).length,0);
  if (mode === 'specialist') { verifySpecialistRole(memory,evidence); return; }
  if (mode === 'refused') {
    assert.equal(state,null); assert.ok(rows.every(row => row.bound === null && row.desired === null && !row.ready && row.work === 0));
    assert.deepEqual(memory.boostRoleAllocation,{ ok: false,reason: 'insufficient-compatible-labs',dryRunUnchanged: true,reapplyUnchanged: true }); return;
  }
  assert.equal(state.owner,'industry'); assert.equal(state.version,1);
  if (mode === 'automatic') {
    const allocation = memory.boostRoleAllocation; assert.equal(allocation.ok,true); assert.equal(allocation.dryRunUnchanged,true); assert.equal(allocation.reapplyUnchanged,true);
    assert.equal(allocation.plan.roles[0].lab,roleLab); assert.equal(allocation.plan.inputs.length,2); assert.equal(allocation.plan.outputs.length,1);
  }
  if (mode === 'normal' || mode === 'automatic') {
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
