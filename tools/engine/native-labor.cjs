const { verifyNativeLaborLoaded } = require('./native-labor-loaded.cjs');
const { verifyNativeLaborInterruption } = require('./native-labor-interruption.cjs');
const { verifyNativeLaborCancel } = require('./native-labor-cancel.cjs');
const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function nativeLaborWorld(server,bot,kind,complete = false,travel = false,loaded = false) {
  const { db } = await server.world.load(); await server.world.setTerrain('W0N1',new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { x: travel ? 20 : 14,y: 14,user: bot.id,level: 4,progress: 0,downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1','storage',13,15,{ user: bot.id,store: { energy: 1000 },storeCapacity: 1000000,hits: 10000,hitsMax: 10000 });
  if (kind === 'build') await server.world.addRoomObject('W0N1','constructionSite',loaded ? 20 : 14,loaded ? 14 : 16,{ user: bot.id,structureType: 'road',progress: complete ? 297 : 0,progressTotal: 300 });
  if (kind === 'repair') await server.world.addRoomObject('W0N1','road',14,16,{ user: bot.id,hits: 1000,hitsMax: 5000,nextDecayTime: 100000 });
}
function verifyNativeLabor(memory,evidence,kind,complete = false,travel = false,cancel = false,fault,loaded = false) {
  const proof = memory.nativeLabor; evidence.nativeLabor = proof; assert.ok(proof); assert.equal(proof.complete,complete); assert.equal(proof.travel,travel); assert.equal(proof.kind,kind); assert.equal(proof.rows.length,26);
  assert.equal(proof.initialSpawn,300); assert.equal(proof.initialEndpoint,1000); assert.equal(proof.activeAt,10);
  assert.deepEqual(memory.stampReloads,loaded ? [11,13,17] : [11,13]);
  assert.equal(proof.loaded,loaded);
  if (loaded) { verifyNativeLaborLoaded(proof); return; }
  if (fault) { verifyNativeLaborInterruption(proof,fault); if (fault === 'before') return; }
  if (cancel) { verifyNativeLaborCancel(proof); return; }
  for (const row of proof.rows.slice(1)) assert.deepEqual(row.actual,row.expected,'native settlement/model mismatch at '+row.tick);
  const spent = complete ? 3 : kind === 'build' ? 10 : 2, load = complete ? 3 : 10, result = proof.result;
  assert.equal(result.cash.birthEnergy,200); assert.equal(result.cash.ambientEnergy,25); assert.equal(result.cash.deliveredEnergy,0);
  assert.equal(result.cash.endingEnergy,1125-spent); assert.equal(result.labor.jobs[0].spent,spent);
  assert.equal(result.labor.jobs[0].returned,load-spent); assert.equal(result.labor.jobs[0].cargo,0);
  assert.equal(result.cash.homeConstructionEnergy,kind === 'build' ? spent : 0); assert.equal(result.cash.upkeepEnergy,kind === 'build' ? 0 : 2);
  if (complete) {
    const cargo = { pool: 'logistics:'+JSON.stringify(['capacity',proof.actorResult.worker]),amount: 50 };
    assert.deepEqual(proof.actorClaims.find(row => row.tick === 10).allocations,[cargo,{ pool: 'logistics:'+JSON.stringify(['stock',proof.proposal.input.source,'energy']),amount: 3 }]);
    assert.deepEqual(proof.actorClaims.find(row => row.tick === 11).allocations,[cargo,{ pool: 'logistics:'+JSON.stringify(['work',proof.proposal.input.order.id,'build']),amount: 3 }]);
    assert.deepEqual(proof.actorClaims.find(row => row.tick === 12).allocations,[]);
    assert.equal(proof.actorReceipt.request,proof.proposal.input.request.id); assert.equal(proof.actorReceipt.unit,proof.actorResult.worker);
    assert.equal(proof.actorReceipt.observedAt,1); assert.equal(proof.actorReceipt.completedAt,12);
    assert.equal(proof.actorReloadAt,11); assert.equal(proof.actorResult.tick,12);
    assert.equal(proof.actorResult.picked,3); assert.equal(proof.actorResult.spent,3); assert.equal(proof.actorResult.returned,0); assert.equal(proof.actorResult.pending,null);
    assert.equal(proof.stagedTask.stagedAt,1); assert.equal(proof.stagedTask.restoredAt,14); assert.equal(proof.stagedTask.readOnly,true);
    assert.deepEqual(proof.birthQueue,{ id: 'ed-W0N1-1',readyAt: 1,expiresAt: 2,activeAt: 10,reserved: true,removed: true });
    assert.equal(proof.proposal.input.request.id,proof.birthQueue.id);
    assert.equal(proof.planning.savedAt,1); assert.equal(proof.planning.resumedAt,14); assert.equal(proof.planning.through,25);
    assert.equal(proof.planning.endingEnergy,1122); assert.equal(proof.planning.readOnlyOperational,true);
    assert.equal(proof.planning.assessment.accepted,false); assert.ok(proof.planning.assessment.rejected.includes('delivery'));
    assert.equal(proof.proposalCurrent,true); assert.equal(proof.proposalReadOnly,true);
    assert.equal(proof.proposal.facts.target.remainingWork,3); assert.equal(proof.proposal.job.energy,3);
  }
  if (travel) { verifyTravel(proof); return; }
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[
    [1,'birth',200,0],[10,'pickup',load,0],[11,kind,complete ? 3 : kind === 'build' ? 5 : 1,0],...(complete ? [] : [[12,kind,kind === 'build' ? 5 : 1,0]]),...(kind === 'build' ? [] : [[13,'return',8,0]]),
  ]);
  evidence.nativeLabor = proof;
}
function verifyTravel(proof) {
  assert.equal(proof.routeReadOnly,true); assert.ok(proof.travelQuote.operations > 0);
  assert.deepEqual(proof.travelQuote.legs.map(leg => [leg.load,leg.path.length,leg.ticks]),[[0,0,0],[10,3,5],[8,3,5]]);
  assert.ok(proof.rows.some(row => row.position?.fatigue > 0));
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.code]),[
    [1,'birth',0],[10,'pickup',0],[11,'move',0],[13,'move',0],[15,'move',0],
    [16,'upgrade',0],[17,'upgrade',0],[18,'move',0],[20,'move',0],[22,'move',0],[23,'return',0],
  ]);
  assert.deepEqual(proof.rows.find(row => row.tick === 16).position,{ x: 17,y: 14,fatigue: 2 });
  assert.deepEqual(proof.rows.find(row => row.tick === 23).position,{ x: 14,y: 15,fatigue: 2 });
}
module.exports = { nativeLaborWorld,verifyNativeLabor };
