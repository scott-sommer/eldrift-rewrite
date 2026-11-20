const assert = require('node:assert/strict');
const { labSupplyWorld } = require('./lab-supply.cjs');
async function labChainWorld(server,bot,mode) {
  await labSupplyWorld(server,bot,'normal');
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'lab' },{ $set: { store: { K: 10 },storeCapacityResource: { K: 3000,energy: 2000 } } });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { H: mode === 'depleted' ? 0 : 100,O: 100,U: 100,Z: 100 } } });
}
function verifyLabChain(memory,mode,evidence) {
  const rows = memory.labChain, last = rows.at(-1), records = memory.eldrift.records;
  evidence.labChain = { mode,rows,reloads: memory.stampReloads,production: records['industry-production/W0N1'],assignment: records['industry-labs/W0N1'] };
  assert.equal(rows.length,640); assert.deepEqual(memory.stampReloads,[31,121,241]);
  assert.equal(evidence.labChain.production.owner,'industry'); assert.equal(evidence.labChain.production.version,1);
  assert.equal(last.step,null); assert.equal(last.cargo,0); assert.deepEqual(records['tasks/lab-courier'].data.queue,[]);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
  assert.ok(rows.every(row => row.pool.UH2O <= 10),'Final target must never be overproduced');
  if (mode === 'depleted') {
    assert.ok(rows.every(row => row.step === null && row.pool.OH === 0 && row.pool.UH === 0 && row.pool.UH2O === 0));
    return;
  }
  const steps = rows.filter(row => row.step).map(row => row.step);
  const distinct = [...new Set(steps)];
  assert.ok(distinct.includes('OH') && distinct.includes('UH') && distinct.includes('UH2O'));
  assert.ok(steps.indexOf('OH') < steps.indexOf('UH2O') && steps.indexOf('UH') < steps.indexOf('UH2O'));
  assert.equal(last.bank.UH2O,10,'Automatic intermediates must reach the final product and bank it');
  assert.equal(last.bank.K,30,'Dirty lab minerals must be recovered through hauling');
  assert.equal(last.pool.XUH2O,0,'Infeasible catalyzed target cannot fabricate catalyst');
  if (mode === 'reserves') {
    assert.ok(last.pool.OH >= 10 && last.pool.UH >= 10,'Warehouse and input reserve floors must both remain funded');
  }
  if (mode === 'priority') { assert.equal(steps[0],'ZH'); assert.equal(last.bank.ZH,5); }
}
module.exports = { labChainWorld,verifyLabChain };
