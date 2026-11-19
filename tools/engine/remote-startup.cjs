const assert = require('node:assert/strict');
const { remotePipelineWorld } = require('./remote-pipeline.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteStartupWorld(server,bot) {
  await remotePipelineWorld(server,bot); const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'container' });
}
function createStartupChanges(mode) {
  const rows = [];
  return { rows,async change(server,bot,modules,index) {
    await server.driver.activateRoom(['W0N1','E0N1']);
    const memory = JSON.parse((await bot.memory) || '{}'), row = memory.pipelineRows?.at(-1);
    if (row && rows.at(-1)?.tick !== row.tick) rows.push(row);
    if (row && index%500 === 0) console.log('STARTUP_PROGRESS '+JSON.stringify({ tick: row.tick,income: row.income,birthCost: row.birthCost,construction: row.probe.construction,pending: row.remotePending,home: row.homeEnergy }));
    return reloadStampDraft(server,bot,modules,index,mode === 'refusal' ? [20,49,80] : [20,700,1250,1490,2100,3500,4500]);
  } };
}
function verifyRemoteStartup(memory,evidence,mode,streamed) {
  const rows = [...streamed,...memory.pipelineRows], last = rows.at(-1), births = memory.pipelineBirths;
  delete evidence.startupDiagnosticRows;
  evidence.remoteStartup = { mode,rows,births,construction: memory.startupConstruction ?? 0,calls: memory.startupCalls ?? [],reloads: memory.stampReloads,attrition: memory.startupAttrition,remoteReceipts: memory.pipelineRemote,localReceipts: memory.pipelineLocal };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(rows.length,mode === 'refusal' ? 150 : 5000); rows.forEach((row,index) => assert.equal(row.tick,index+1));
  assert.equal(rows[0].visible,false); assert.equal(rows[0].lease,null);
  for (const row of rows) { assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel); }
  if (mode === 'refusal') {
    assert.ok(Object.values(births).every(birth => ['scout','distributor'].includes(birth.family)));
    assert.equal(last.income,0); assert.equal(last.probe.construction,0); assert.equal(last.probe.staleAt,50);
    assert.ok(rows.find(row => row.tick === 50).remotePending > 0,'stale valid family request must survive the zero recruitment budget frame');
    assert.ok(!evidence.remoteStartup.calls.some(call => ['miner','courier','reserver'].includes(call.family)),'final startup admission must refuse native effects');
    assert.equal(last.remotePending,0); assert.deepEqual(memory.stampReloads,[21,50,81]); return;
  }
  const built = rows.find(row => row.probe.sites.some(site => site.complete)); assert.ok(built,'ordinary miner must build the missing container');
  assert.equal(evidence.remoteStartup.construction,5000);
  assert.ok(rows.some(row => row.probe.construction > 0 && row.probe.construction < 5000));
  const couriers = Object.values(births).filter(birth => birth.family === 'courier'), reservers = Object.values(births).filter(birth => birth.family === 'reserver');
  assert.ok(couriers.length >= 4 && reservers.length >= 2,'staged population must operate through natural replacement');
  assert.ok(couriers.every(birth => birth.seenAt >= built.tick-60),'couriers must not idle through the construction warmup');
  assert.ok(reservers.every(birth => birth.seenAt >= built.tick),'reservation births wait for actual collection readiness');
  assert.ok(Object.values(births).every(birth => birth.activeAt !== undefined),'normal startup must not churn cancelled births');
  assert.ok(last.stopped >= 4000 && last.stopped <= 4700); assert.equal(last.lease,null);
  const loss = memory.startupAttrition.localExpiryEnergy;
  assert.equal(memory.startupAttrition.recoveredAttempts,0,'expiry loss attribution requires no successful grave/drop recovery');
  assert.equal(last.probe.inactiveEnergy,0,'inactive home assets must have fully decayed before final cash reconciliation');
  assert.equal(loss,memory.startupAttrition.expiries.filter(item => item.family === 'distributor').reduce((sum,item) => sum+item.tombstoneEnergy,0));
  assert.ok(last.income-last.birthCost-5000-loss > 0,'confirmed deliveries must recover births, construction and measured local expiry loss');
  assert.equal(last.remotePending,0); assert.equal(last.quantityClaims,0); assert.equal(last.miningClaims,0);
  assert.ok(last.units.filter(unit => ['miner','courier','reserver'].includes(unit.family)).every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks === 0 && !unit.spawning));
  const capital = row => row.homeEnergy+row.units.reduce((sum,unit) => sum+unit.cargo,0)+row.birthCost+(row.probe.localExpiryEnergy ?? 0)-row.income;
  assert.equal(capital(last),capital(rows[0]),'home capital, births and independent delivery receipts reconcile after withdrawal');
  for (const id of Object.keys(memory.pipelineRemote.amounts)) assert.ok(!Object.hasOwn(memory.pipelineLocal.amounts,id));
  assert.deepEqual(memory.stampReloads,[21,701,1251,1491,2101,3501,4501]);
}
module.exports = { remoteStartupWorld,createStartupChanges,verifyRemoteStartup };
