const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function nativeLaborWorld(server,bot,kind,complete = false,travel = false) {
  const { db } = await server.world.load(); await server.world.setTerrain('W0N1',new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { x: travel ? 20 : 14,y: 14,user: bot.id,level: 4,progress: 0,downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1','storage',13,15,{ user: bot.id,store: { energy: 1000 },storeCapacity: 1000000,hits: 10000,hitsMax: 10000 });
  if (kind === 'build') await server.world.addRoomObject('W0N1','constructionSite',14,16,{ user: bot.id,structureType: 'road',progress: complete ? 297 : 0,progressTotal: 300 });
  if (kind === 'repair') await server.world.addRoomObject('W0N1','road',14,16,{ user: bot.id,hits: 1000,hitsMax: 5000,nextDecayTime: 100000 });
}
function verifyNativeLabor(memory,evidence,kind,complete = false,travel = false) {
  const proof = memory.nativeLabor; evidence.nativeLabor = proof; assert.ok(proof); assert.equal(proof.complete,complete); assert.equal(proof.travel,travel); assert.equal(proof.kind,kind); assert.equal(proof.rows.length,26);
  assert.equal(proof.initialSpawn,300); assert.equal(proof.initialEndpoint,1000); assert.equal(proof.activeAt,10);
  assert.deepEqual(memory.stampReloads,[11,13]);
  for (const row of proof.rows.slice(1)) assert.deepEqual(row.actual,row.expected,'native settlement/model mismatch at '+row.tick);
  const spent = complete ? 3 : kind === 'build' ? 10 : 2, load = complete ? 3 : 10, result = proof.result;
  assert.equal(result.cash.birthEnergy,200); assert.equal(result.cash.ambientEnergy,25); assert.equal(result.cash.deliveredEnergy,0);
  assert.equal(result.cash.endingEnergy,1125-spent); assert.equal(result.labor.jobs[0].spent,spent);
  assert.equal(result.labor.jobs[0].returned,load-spent); assert.equal(result.labor.jobs[0].cargo,0);
  assert.equal(result.cash.homeConstructionEnergy,kind === 'build' ? spent : 0); assert.equal(result.cash.upkeepEnergy,kind === 'build' ? 0 : 2);
  if (travel) { verifyTravel(proof); return; }
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[
    [1,'birth',200,0],[10,'pickup',load,0],[11,kind,complete ? 3 : kind === 'build' ? 5 : 1,0],...(complete ? [] : [[12,kind,kind === 'build' ? 5 : 1,0]]),...(kind === 'build' ? [] : [[13,'return',8,0]]),
  ]);
  evidence.nativeLabor = proof;
}
function verifyTravel(proof) {
  assert.ok(proof.rows.some(row => row.position?.fatigue > 0));
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.code]),[
    [1,'birth',0],[10,'pickup',0],[11,'move',0],[13,'move',0],[15,'move',0],
    [16,'upgrade',0],[17,'upgrade',0],[18,'move',0],[20,'move',0],[22,'move',0],[23,'return',0],
  ]);
  assert.deepEqual(proof.rows.find(row => row.tick === 16).position,{ x: 17,y: 14,fatigue: 2 });
  assert.deepEqual(proof.rows.find(row => row.tick === 23).position,{ x: 14,y: 15,fatigue: 2 });
}
module.exports = { nativeLaborWorld,verifyNativeLabor };
