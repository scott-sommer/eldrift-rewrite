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
  assert.equal(rows.length,320); assert.deepEqual(memory.stampReloads,[31,181]);
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
  assert.equal(last.bankOH,mode === 'depleted' ? 0 : 15); assert.equal(last.bankUH,mode === 'switch' ? 15 : 0);
  assert.equal(last.assignment,mode === 'switch' ? 'UH' : 'OH');
  assert.ok(rows.every(row => row.bankOH+row.labOH <= 15 && row.bankUH+row.labUH <= 15));
}
module.exports = { labSupplyWorld,verifyLabSupply };
