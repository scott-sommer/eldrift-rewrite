const assert = require('node:assert/strict');
const { boostBulkWorld } = require('./boost-bulk.cjs');
async function labEmpireWorld(server,bot) {
  await boostBulkWorld(server,bot,'normal'); const { db } = await server.world.load();
  for (const room of ['W0N1','W1N1']) await db['rooms.objects'].update({ room,type: 'storage' },{ $set: { store: { energy: 100000,H: 200,O: 200,U: 200,XGH2O: 120 } } });
}
function verifyLabEmpire(memory,evidence) {
  const rows = memory.empireProductionRows, records = memory.eldrift.records, last = rows.at(-1);
  evidence.empireProduction = { rows,reloads: memory.stampReloads,state: records['industry-empire-production/empire'] };
  assert.equal(rows.length,640); assert.deepEqual(memory.stampReloads,[31,181,401]);
  assert.ok(rows.every(row => row.total <= 15),'Shared target cannot be independently produced in each room');
  assert.equal(last.total,15); assert.deepEqual(last.windows,[]);
  assert.deepEqual(rows[0].windows.map(item => [item.home,item.amount]),[['W0N1',10],['W1N1',5]]);
  for (const home of ['W0N1','W1N1']) {
    const room = last.rooms.find(item => item.home === home);
    assert.equal(room.bank,home === 'W0N1' ? 10 : 5); assert.equal(room.rootInLabs,0); assert.equal(room.cargo,0);
    assert.equal(room.buffer.mineral,'XGH2O'); assert.equal(room.buffer.amount,60); assert.equal(room.buffer.energy,40);
    assert.ok(rows.every(row => !row.rooms.find(item => item.home === home).reactionLabs.includes(room.buffer.id)));
    assert.deepEqual(records['tasks/'+room.courier].data.queue,[]);
    assert.ok(rows.some(row => row.windows.some(item => item.home === home && item.step?.product === 'OH')));
    assert.ok(rows.some(row => row.windows.some(item => item.home === home && item.step?.product === 'UH')));
    assert.ok(rows.some(row => row.windows.some(item => item.home === home && item.step?.product === 'UH2O')));
  }
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
}
module.exports = { labEmpireWorld,verifyLabEmpire };
