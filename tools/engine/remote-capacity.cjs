const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteCapacityWorld(server,bot,mode) {
  await server.world.setTerrain('W0N1',new TerrainMatrix());
  const { db } = await server.world.load(), funded = mode === 'idle' || mode === 'busy';
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 6,downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'spawn' },{ $set: { store: { energy: funded ? 300 : 0 } } });
  for (let index = 0; index < 40; index++) await server.world.addRoomObject('W0N1','extension',25+index%10,20+Math.floor(index/10),
    { user: bot.id,store: { energy: funded ? 50 : 0 },storeCapacityResource: { energy: 50 },hits: 1000,hitsMax: 1000 });
}
function changeRemoteCapacity(server,bot,modules,index,mode) {
  return reloadStampDraft(server,bot,modules,index,mode === 'idle' || mode === 'starved' ? [20,750,1499,1501] : [10,20]);
}
function verifyRemoteCapacity(memory,evidence,mode) {
  const rows = memory.capacityRows, last = rows.at(-1), calls = memory.capacityCalls ?? [];
  evidence.remoteCapacity = { mode,rows,calls,reloads: memory.stampReloads };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(rows.length,mode === 'idle' || mode === 'starved' ? 1505 : 30);
  assert.deepEqual(memory.eldrift.records['fixture/capacity'],{ owner: 'fixture',version: 1,data: { preserved: true } });
  assert.ok(rows.every(row => row.pending.includes('unrelated-capacity')));
  assert.ok(rows.every(row => row.segments === null || row.segments <= 1500));
  if (mode === 'off') {
    assert.equal(memory.eldrift.records['spawnLoad/W0N1'],undefined); assert.equal(memory.eldrift.records['remoteCapacity/W0N1'],undefined);
    assert.deepEqual(calls,[]); assert.ok(rows.every(row => row.supported === null && row.pending.includes('pressure')));
  } else if (mode === 'busy') {
    assert.deepEqual(calls,[{ tick: 1,name: 'pressure',code: 0 }]);
    assert.ok(rows.some(row => row.busy > 0)); assert.ok(rows.every(row => row.starved === 0));
    assert.equal(last.busy,12,'accepted four-part body occupies exactly twelve observed spawn ticks');
    assert.deepEqual(last.names,['pressure']); assert.deepEqual(last.pending,['unrelated-capacity']);
  } else {
    assert.deepEqual(calls,[]); assert.ok(rows.every(row => row.names.length === 0));
    assert.ok(rows.filter(row => row.tick <= 1500).every(row => row.supported === 3 && row.evaluatedAt === 1));
    assert.equal(rows.find(row => row.tick === 1500).coverage,1);
    assert.equal(rows.find(row => row.tick === 1501).supported,mode === 'idle' ? 4 : 2);
    assert.equal(last.evaluatedAt,1501); assert.equal(last.observedLoad,mode === 'idle' ? 0 : 1);
    assert.equal(last.load,mode === 'idle' ? 0 : 1); assert.equal(last.segments,1);
    if (mode === 'starved') { assert.equal(last.starved,1500); assert.ok(rows.every(row => row.pending.includes('pressure') && row.energy < 1300)); }
  }
  assert.deepEqual(memory.stampReloads,mode === 'idle' || mode === 'starved' ? [21,751,1500,1502] : [11,21]);
}
module.exports = { remoteCapacityWorld,changeRemoteCapacity,verifyRemoteCapacity };
