const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function nativeLaborWorld(server,bot,kind) {
  const { db } = await server.world.load(); await server.world.setTerrain('W0N1',new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { x: 14,y: 14,user: bot.id,level: 4,progress: 0,downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1','storage',13,15,{ user: bot.id,store: { energy: 1000 },storeCapacity: 1000000,hits: 10000,hitsMax: 10000 });
  if (kind === 'build') await server.world.addRoomObject('W0N1','constructionSite',14,16,{ user: bot.id,structureType: 'road',progress: 0,progressTotal: 300 });
  if (kind === 'repair') await server.world.addRoomObject('W0N1','road',14,16,{ user: bot.id,hits: 1000,hitsMax: 5000,nextDecayTime: 100000 });
}
function verifyNativeLabor(memory,evidence,kind) {
  const proof = memory.nativeLabor; assert.ok(proof); assert.equal(proof.kind,kind); assert.equal(proof.rows.length,26);
  assert.equal(proof.initialSpawn,300); assert.equal(proof.initialEndpoint,1000); assert.equal(proof.activeAt,10);
  assert.deepEqual(memory.stampReloads,[11,13]);
  for (const row of proof.rows.slice(1)) assert.deepEqual(row.actual,row.expected,'native settlement/model mismatch at '+row.tick);
  const spent = kind === 'build' ? 10 : 2, result = proof.result;
  assert.equal(result.cash.birthEnergy,200); assert.equal(result.cash.ambientEnergy,25); assert.equal(result.cash.deliveredEnergy,0);
  assert.equal(result.cash.endingEnergy,1125-spent); assert.equal(result.labor.jobs[0].spent,spent);
  assert.equal(result.labor.jobs[0].returned,10-spent); assert.equal(result.labor.jobs[0].cargo,0);
  assert.equal(result.cash.homeConstructionEnergy,kind === 'build' ? 10 : 0); assert.equal(result.cash.upkeepEnergy,kind === 'build' ? 0 : 2);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[
    [1,'birth',200,0],[10,'pickup',10,0],[11,kind,kind === 'build' ? 5 : 1,0],[12,kind,kind === 'build' ? 5 : 1,0],...(kind === 'build' ? [] : [[13,'return',8,0]]),
  ]);
  evidence.nativeLabor = proof;
}
module.exports = { nativeLaborWorld,verifyNativeLabor };
