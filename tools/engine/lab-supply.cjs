const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function labSupplyWorld(server,bot,mode) {
  await server.world.setTerrain('W0N1',new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 8,downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1','storage',20,19,{ user: bot.id,store: { H: mode === 'depleted' ? 0 : 40,O: 20,U: 20 },storeCapacity: 1000000,hits: 10000,hitsMax: 10000 });
  for (const [x,y] of [[20,20],[20,22],[21,21]]) await server.world.addRoomObject('W0N1','lab',x,y,{ user: bot.id,store: { X: 10 },
    storeCapacityResource: { X: 3000,energy: 2000 },storeCapacity: null,hits: 500,hitsMax: 500,cooldownTime: 0 });
  await server.world.addRoomObject('W0N1','creep',19,20,{ user: bot.id,name: 'lab-courier',body: ['carry','move'].map(type => ({ type,hits: 100 })),
    store: {},storeCapacity: 50,hits: 200,hitsMax: 200,fatigue: 0,spawning: false,ageTime: 1500 });
}
function verifyLabSupply(memory,mode,evidence) {
  const rows = memory.labSupply; evidence.labSupply = { mode,rows,reloads: memory.stampReloads };
  assert.equal(rows.length,320); assert.deepEqual(memory.stampReloads,mode === 'replan' ? [11,31,181] : [31,181]);
  const last = rows.at(-1), records = memory.eldrift.records;
  evidence.labSupply.assignment = records['industry-labs/W0N1'];
  assert.equal(evidence.labSupply.assignment.owner,'industry');
  assert.equal(evidence.labSupply.assignment.version,1);
  assert.deepEqual(records['tasks/lab-courier'].data.queue,[]);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 320).length,0);
  assert.equal(last.cargo,0,'No carried cargo may be stranded');
  const receipts = records['logistics-requests/W0N1'].data.records.filter(record => record.request.owner.startsWith('industry-labs:'));
  evidence.labSupply.retainedReceipts = receipts;
  assert.ok(rows.some(row => row.receipts > 0),'Native confirmations must credit ordinary hauling');
  assert.ok(rows.some(row => row.cargo > 0),'Ordinary courier must execute the service');
  if (mode === 'cancel') {
    assert.equal(last.assignment,null); assert.equal(last.bankOH+last.labOH+last.bankUH+last.labUH,0);
    assert.equal(receipts.filter(record => !record.cancelled && record.receipts.reduce((sum,item) => sum+item.amount,0) < record.request.quantity).length,0);
    return;
  }
  assert.equal(last.bankX,30,'Every incompatible mineral is banked before new input stock');
  assert.equal(last.labOH+last.labUH,0,'Manufactured product is drained to the warehouse');
  assert.equal(last.bankOH,mode === 'depleted' ? 0 : 15); assert.equal(last.bankUH,['switch','operator'].includes(mode) ? 15 : 0);
  assert.equal(last.assignment,['switch','operator'].includes(mode) ? 'UH' : 'OH');
  if (mode === 'operator') {
    assert.ok(rows.filter(row => row.tick >= 8 && row.tick < 20).every(row => !row.enabled && row.source === 'temporary' && row.temporaryActive));
    assert.ok(rows.filter(row => row.tick >= 20).every(row => row.enabled && row.source === 'roomOverride' && !row.temporaryActive));
    assert.equal(rows.find(row => row.tick === 139).product,'OH'); assert.equal(rows.find(row => row.tick === 140).product,'UH');
    assert.ok(rows.some(row => row.tick >= 8 && row.tick < 20 && row.cargo > 0),'Admitted supply must survive the operator pause');
    const paused = rows.filter(row => row.tick >= 8 && row.tick < 20), carrying = paused.find(row => row.cargo > 0);
    assert.ok(paused.some(row => row.tick > carrying.tick && row.cargo === 0 && row.receipts >= carrying.receipts+carrying.cargo && row.assignment === null),'Admitted cargo must settle with matching credit before assignment release');
  }
  if (mode === 'replan') {
    const request = memory.labReplanRequest, replans = memory.labReplanRows;
    evidence.labReplan = { rows: replans,request };
    assert.equal(request.unchanged,true); assert.ok(request.cargo > 0,'Request must occur during actual admitted cargo');
    const pending = replans.filter(row => row.pending); assert.ok(pending.some(row => row.tick === 11),'Reload must occur while request is pending');
    assert.ok(pending.every(row => JSON.stringify(row.assignment) === JSON.stringify(request.assignment)),'Pending replan retains assignment identity');
    const retired = replans.find(row => row.tick >= request.tick && !row.pending && row.assignment.data.assignment === null);
    assert.ok(retired,'Replan retires the assignment after admitted work settles');
    assert.equal(retired.cargo,0); assert.ok(rows.find(row => row.tick === retired.tick).receipts >= rows.find(row => row.tick === request.tick).receipts+request.cargo,'Admitted cargo receives credit before retirement');
    assert.ok(replans.some(row => row.tick > retired.tick && row.assignment.data.assignment?.product === 'OH'),'Unchanged policy rebuilds after drain tick');
    assert.deepEqual(records['industry-lab-maintenance/empire'],{ owner: 'industry',version: 1,data: { pending: [] } });
  }
  assert.ok(rows.every(row => row.bankOH+row.labOH <= 15 && row.bankUH+row.labUH <= 15));
}
module.exports = { labSupplyWorld,verifyLabSupply };
