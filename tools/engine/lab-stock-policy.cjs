const assert = require('node:assert/strict');
const { labEmpireWorld } = require('./lab-empire.cjs');
async function stockPolicyWorld(server,bot) {
  await labEmpireWorld(server,bot,'normal');
  for (const room of ['W0N1','W1N1']) await server.world.addRoomObject(room,'terminal',22,17,{ user: bot.id,store: {},storeCapacity: 300000,hits: 3000,hitsMax: 3000,cooldownTime: 0 });
}
function verifyStockPolicy(memory,evidence,mode) {
  const rows = memory.stockPolicyRows, last = rows.at(-1), records = memory.eldrift.records;
  evidence.stockPolicy = { mode,rows,reloads: memory.stampReloads };
  assert.equal(rows.length,640); assert.deepEqual(memory.stampReloads,[31,121,401]);
  const total = (row,product) => row.rooms.reduce((sum,room) => sum+room[product],0);
  if (mode === 'priority') {
    assert.equal(total(last,'OH'),15); assert.equal(total(last,'UH'),5); assert.equal(total(last,'UH2O'),0);
    assert.ok(rows.some(row => total(row,'OH') === 5 && total(row,'UH') === 0));
    assert.ok(rows.filter(row => total(row,'UH') < 5).every(row => total(row,'OH') <= 5),'Second OH threshold must not preempt middle UH priority');
    assert.equal(last.rooms.reduce((sum,room) => sum+room.bankRoot,0),15);
  } else {
    assert.equal(total(last,'UH2O'),mode === 'local' ? 30 : 15);
    if (mode === 'shared') {
      assert.deepEqual(rows[0].windows.map(window => [window.home,window.product,window.amount]),[['W0N1','OH',10],['W1N1','OH',5]],'Two terminals produce one shared intermediate target15');
      for (const product of ['OH','UH','UH2O']) assert.ok(rows.some(row => row.windows.some(window => window.product === product)));
      const active = rows.filter(row => total(row,'UH2O') < 15).flatMap(row => row.windows.filter(window => !window.retiring).map(window => window.context));
      assert.equal(new Set(active).size,1,'Intermediate deficits must not churn durable root policy context');
    } else {
      assert.ok(rows.every(row => row.windows.length === 0));
      assert.ok(rows[0].rooms.every(room => room.step?.root === 'OH' && room.step.target === 10),'Local policy scales against one local terminal');
      assert.ok(last.rooms.every(room => room.bankRoot === 15));
    }
    assert.equal(last.rooms.reduce((sum,room) => sum+room.bankRoot,0),mode === 'local' ? 30 : 15);
  }
  assert.deepEqual(last.windows,[]); assert.ok(last.rooms.every(room => room.cargo === 0));
  for (const name of ['boost-courier','boost-courier-second']) assert.deepEqual(records['tasks/'+name].data.queue,[]);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
}
module.exports = { stockPolicyWorld,verifyStockPolicy };
