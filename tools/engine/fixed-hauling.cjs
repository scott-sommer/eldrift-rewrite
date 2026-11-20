const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { resourceWorld } = require('./resources.cjs');
async function fixedHaulingWorld(server,bot) {
  await server.world.setTerrain('W0N1',new TerrainMatrix());
  await resourceWorld(server,bot);
  await server.world.addRoomObject('W0N1','creep',19,20,{ name: 'station-miner',user: bot.id,body: ['work','carry','move'].map(type => ({ type,hits: 100 })),store: {},storeCapacity: 50,hits: 300,hitsMax: 300,spawning: false,fatigue: 0,ageTime: 1500 });
}
function verifyFixedHauling(memory,evidence) {
  const rows = memory.fixedHauling, calls = memory.fixedCalls ?? [], records = memory.eldrift.records;
  evidence.fixedHauling = { rows,calls,reloads: memory.stampReloads,records: records['logistics-requests/W0N1'],task: records['tasks/hauler'],quantities: records['quantity-reservations/empire'],journal: records['logistics-attempts/hauler'],diagnostics: records['runtime/diagnostics'] };
  assert.equal(rows.length,16); assert.deepEqual(memory.stampReloads,[5]);
  assert.deepEqual(rows[0].position,{ x: 20,y: 20 }); assert.deepEqual(rows[0].stores,[30,0,0]);
  assert.deepEqual(calls.map(call => [call.kind,call.x,call.y,call.code]),[['collect',18,20,0],['deliver',22,20,0]]);
  assert.ok(calls[0].tick > 1); assert.ok(calls[1].tick > calls[0].tick);
  assert.ok(rows.every(row => row.stores.reduce((a,b) => a+b,0) === 30));
  assert.deepEqual(rows.at(-1).stores,[0,0,30]); assert.equal(rows.at(-1).pending,0); assert.equal(rows.at(-1).tasks,0); assert.equal(rows.at(-1).claims,0);
  const queue = records['logistics-requests/W0N1']; assert.equal(queue.version,2);
  const delivered = queue.data.records.find(record => record.request.id === 'fixed'); assert.equal(delivered.receipts.length,1); assert.equal(delivered.receipts[0].amount,30);
  const legacy = queue.data.records.find(record => record.request.id === 'legacy'); assert.deepEqual(legacy.receipts,[{ id: 'prior',amount: 1 }]); assert.equal(legacy.request.quantity,5); assert.equal(legacy.cancelled,false);
  evidence.fixedHauling = { rows,calls,reloads: memory.stampReloads,records: queue.data.records };
}
module.exports = { fixedHaulingWorld,verifyFixedHauling };
