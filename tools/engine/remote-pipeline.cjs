const { verifyPipelineLabor } = require('./remote-pipeline-labor.cjs');
const assert = require('node:assert/strict');
const { reservationPopulationWorld } = require('./reservation-population.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remotePipelineWorld(server,bot,labor = false,calibration = false,shared = false) {
  await reservationPopulationWorld(server,bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep' });
  if (calibration) await db['rooms.objects'].update({ room: 'E0N1',type: 'container' },{ $set: { nextDecayTime: 100 } });
  if (shared) {
    await server.world.addRoomObject('E0N1','source',10,25,{ energy: 1500,energyCapacity: 1500,ticksToRegeneration: 300 });
    await server.world.addRoomObject('E0N1','container',9,25,{ store: { energy: 0 },storeCapacity: 2000,hits: 250000,hitsMax: 250000,nextDecayTime: 100 });
  }
  if (labor) await server.world.addRoomObject('W0N1','constructionSite',46,26,{ user: bot.id,structureType: 'road',progress: 297,progressTotal: 300 });
}
async function changeRemotePipeline(server,bot,modules,index,configured = false) {
  await server.driver.activateRoom(['W0N1','E0N1']);
  return reloadStampDraft(server,bot,modules,index,configured ? [20,40,310,590,860] : [20,310,590,860]);
}
function verifyRemotePipeline(memory,evidence,labor = false,unreserved = false,configured = false) {
  const rows = memory.pipelineRows, last = rows.at(-1);
  evidence.remotePipeline = { rows,births: memory.pipelineBirths,remoteReceipts: memory.pipelineRemote,localReceipts: memory.pipelineLocal,reloads: memory.stampReloads };
  assert.equal(rows.length,1000); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(rows[0].visible,false); assert.equal(rows[0].lease,null); assert.ok(rows[0].units.every(unit => unit.spawning));
  assert.ok(rows.some(row => row.units.some(unit => unit.family === 'scout' && unit.room === 'E0N1')),'recruited scout must reveal the remote');
  assert.ok(rows.some(row => row.discovered.includes('E0N1') && row.lease && row.lease.reserve === !unreserved),'ordinary discovery/management must select priced reservation');
  for (const family of ['scout','distributor','miner','courier',...(unreserved ? [] : ['reserver'])]) assert.ok(Object.values(memory.pipelineBirths).some(birth => birth.family === family),family+' must be recruited');
  if (!unreserved) assert.ok(rows.some(row => row.reservation > 5 && row.units.some(unit => unit.family === 'reserver' && !unit.spawning && unit.room === 'E0N1')),'recruited reserver must actually buffer the controller');
  if (!unreserved) assert.ok(rows.some(row => row.source?.capacity === 3000),'reservation must affect observed source capacity');
  else {
    assert.ok(rows.every(row => row.reservation === null && (!row.source || row.source.capacity === 1500)));
    assert.ok(Object.values(memory.pipelineBirths).every(birth => birth.family !== 'reserver'));
  }
  assert.ok(rows.some(row => row.quantityClaims > 0 && row.miningClaims > 0),'probe must observe owned resource claims before cleanup');
  assert.ok(Object.values(memory.pipelineBirths).every(birth => birth.activeAt !== undefined),'stable one-outpost startup must not churn cancelled births');
  assert.ok(Object.values(memory.pipelineBirths).filter(birth => ['miner','courier','reserver'].includes(birth.family)).every(birth => birth.target === 'E0N1'),'blocked adjacent rooms must not acquire workforce');
  if (labor) verifyPipelineLabor(memory,evidence);
  const laborExpense = labor ? memory.pipelineLabor.birthCost+memory.pipelineLabor.receipt.spent : 0;
  assert.ok(last.income > last.birthCost+laborExpense,'confirmed remote deliveries must exceed observed workforce birth expenditure');
  assert.ok(last.localTransfers > 0,'home redistribution must actually run');
  for (const id of Object.keys(memory.pipelineRemote.amounts)) assert.ok(!Object.hasOwn(memory.pipelineLocal.amounts,id),'local redistribution cannot also be credited as remote income');
  const earliestStop = configured ? Math.max(800,memory.pipelineCalibration.quote.observedAt+memory.pipelineCalibration.horizon+1) : 800;
  assert.ok(last.stopped >= earliestStop && last.stopped < earliestStop+100); assert.equal(last.lease,null); assert.equal(last.remotePending,0); assert.equal(last.quantityClaims,0); assert.equal(last.miningClaims,0);
  assert.ok(last.units.filter(unit => ['miner','courier','reserver'].includes(unit.family)).every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks === 0 && !unit.spawning));
  for (const row of rows) { assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel); }
  const capital = row => row.homeEnergy+row.units.reduce((sum,unit) => sum+unit.cargo,0)+row.birthCost-row.income;
  assert.equal(capital(last)+laborExpense,capital(rows[0]),'final stock plus births must reconcile to initial capital and independently confirmed remote income');
  assert.deepEqual(memory.stampReloads,configured ? [21,41,311,591,861] : [21,311,591,861]);
}
module.exports = { remotePipelineWorld,changeRemotePipeline,verifyRemotePipeline };
