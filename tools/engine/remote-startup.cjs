const assert = require('node:assert/strict');
const { remotePipelineWorld } = require('./remote-pipeline.cjs');
const { verifyStartupAdmission } = require('./remote-startup-admission.cjs');
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
    return reloadStampDraft(server,bot,modules,index,mode === 'refusal' ? [20,49,80] : ['admission','selected','selection-expiry'].includes(mode) ? [20,80,149] : [20,700,1250,1490,2100,3500,4500]);
  } };
}
function verifyRemoteStartup(memory,evidence,mode,streamed) {
  const rows = [...streamed,...memory.pipelineRows], last = rows.at(-1), births = memory.pipelineBirths;
  delete evidence.startupDiagnosticRows;
  evidence.remoteStartup = { mode,rows,births,construction: memory.startupConstruction ?? 0,calls: memory.startupCalls ?? [],reloads: memory.stampReloads,attrition: memory.startupAttrition,remoteReceipts: memory.pipelineRemote,localReceipts: memory.pipelineLocal };
  if (memory.startupFacts) evidence.remoteStartup.nativeFacts = memory.startupFacts;
  if (memory.startupTravel) evidence.remoteStartup.nativeTravel = memory.startupTravel;
  if (memory.startupProjectProof) evidence.remoteStartup.projectCheckpoint = memory.startupProjectProof;
  if (memory.startupHistoricalMigration) evidence.remoteStartup.historicalMigration = memory.startupHistoricalMigration;
  if (memory.startupCandidateMigration) evidence.remoteStartup.candidateMigration = memory.startupCandidateMigration;
  if (memory.startupPassiveMigration) evidence.remoteStartup.passiveMigration = memory.startupPassiveMigration;
  if (memory.startupPlanningProof) evidence.remoteStartup.planningJob = memory.startupPlanningProof;
  if (memory.nativeProjection) evidence.remoteStartup.nativeProjection = memory.nativeProjection;
  if (memory.startupScheduleProbe) evidence.remoteStartup.scheduleProbe = memory.startupScheduleProbe;
  if (memory.householdScheduleProbe) evidence.remoteStartup.householdProbe = memory.householdScheduleProbe;
  if (memory.householdTravelProbe) evidence.remoteStartup.householdTravel = memory.householdTravelProbe;
  if (memory.incumbentProjection) evidence.remoteStartup.incumbentProjection = memory.incumbentProjection;
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(rows.length,mode === 'staged' ? 5000 : 150); rows.forEach((row,index) => assert.equal(row.tick,index+1));
  assert.equal(rows[0].visible,false); assert.equal(rows[0].lease,null);
  for (const row of rows) { assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel); }
  if (mode === 'admission') return verifyStartupAdmission(memory,rows);
  if (['selected','selection-expiry'].includes(mode)) {
    evidence.remoteStartup.selection = memory.selectedStartup;
    evidence.remoteStartup.firstReady = memory.selectedReady;
    evidence.remoteStartup.attempts = memory.selectedAttempts;
    evidence.remoteStartup.selectionChecks = memory.selectedChecks;
    assert.deepEqual(memory.selectedChecks.map(row => row.tick),[30,46,81,150]);
    assert.ok(memory.selectedChecks.every(row => row.available === (mode === 'selected') && row.revision === 1 && row.count === 1 && row.readOnly));
    const selection = memory.selectedStartup; assert.ok(selection);
    assert.deepEqual(memory.selectedAttempts.map(item => item.legs),[2,4,5]);
    const miners = Object.values(births).filter(birth => birth.family === 'miner');
    assert.equal(miners.length,1); assert.ok(miners[0].seenAt >= selection.tick);
    assert.ok(miners[0].activeAt); assert.ok(last.probe.construction > 0);
    const { tick,...position } = memory.selectedReady;
    assert.equal(tick,miners[0].activeAt); assert.deepEqual(position,selection.plan.spawn.exit);
    assert.equal(last.income,0); assert.deepEqual(memory.stampReloads,[21,81,150]);
    if (mode === 'selected') {
      const acceptedCalls = memory.startupCalls.filter(call => call.code === 0); assert.ok(acceptedCalls.length > 0);
      for (const call of acceptedCalls) { assert.ok(call.energyOrder.length > 0); assert.deepEqual(call.energyOrder,call.expectedEnergyOrder); }
      const projection = memory.nativeProjection; assert.ok(projection);
      const travelProof = memory.householdTravelProbe; assert.equal(travelProof.readOnly,true); const travel = travelProof.quote;
      assert.equal(travel.status,'complete'); assert.equal(travel.observedAt,25); assert.equal(travel.destination.capacity,300);
      assert.ok(travel.destination.capacity < travelProof.aggregateSpawnCapacity); assert.equal(travel.plan.destination.id,travel.plan.spawn.id);
      assert.deepEqual(travel.legs.map(leg => [leg.kind,leg.load,leg.range]),[['approach',0,0],['loaded',100,0],['return',0,0]]);
      for (const leg of travel.legs) assert.deepEqual(leg.arrival,leg.destination);
      assert.ok(travel.source.availableEnergy <= travel.source.energy); assert.ok(travel.destination.availableCapacity <= travel.destination.freeCapacity);
      const schedule = memory.startupScheduleProbe; assert.ok(schedule); assert.equal(schedule.frames,20005);
      assert.deepEqual(schedule.rows.map(row => row.tick),[25,30,46,81,150]); assert.equal(schedule.rows.at(-1).status,'complete');
      assert.equal(schedule.result.spawning.births.length,6); assert.equal(schedule.result.cash.birthEnergy,2250);
      assert.equal(schedule.readOnly,true);
      const household = memory.householdScheduleProbe; assert.ok(household); assert.equal(household.frames,20005);
      assert.deepEqual(household.rows.map(row => row.tick),[25,30,46,81,150]); assert.equal(household.rows.at(-1).status,'complete');
      assert.equal(household.result.spawning.births.length,7); assert.equal(household.result.cash.birthEnergy,2450);
      assert.deepEqual(household.result.spawning.redistribution,{ picked: 400,delivered: 400,cargo: 0,lost: 0,endpointEnergy: household.seed.household.endpointEnergy+household.result.delivery.deliveredEnergy-400-4 });
      assert.equal(household.result.homeSink.remainingCapacity,household.seed.homeSink.freeCapacity+400+4-household.result.delivery.deliveredEnergy);
      assert.equal(household.result.cash.deliveredEnergy,household.result.delivery.deliveredEnergy); assert.equal(household.readOnly,true);
      assert.ok(household.seed.project.spawning.funding.energyLayout.regeneration);
      assert.ok(household.result.cash.ambientEnergy > 0); assert.equal(household.result.projectCash.ambientEnergy,household.result.cash.ambientEnergy); assert.equal(household.previewFrames,1); assert.equal(household.energyPolicy,'spawn-first-range-id-v1');
      const homeBirth = household.result.spawning.births.find(birth => birth.request === 'household-probe');
      const approach = travel.legs.find(leg => leg.kind === 'approach').ticks, loaded = travel.legs.find(leg => leg.kind === 'loaded').ticks, returning = travel.legs.find(leg => leg.kind === 'return').ticks;
      household.seed.household.redistribution.trips.forEach((trip,index) => {
        assert.equal(trip.pickupAt,homeBirth.activeAt+approach+index*(1+loaded+1+returning)); assert.equal(trip.loadedTicks,loaded); assert.equal(trip.returnTicks,returning); assert.equal(trip.destination,travel.plan.destination.id);
      });
      assert.equal(household.root.eldrift.records['remoteStartupPlanning/W0N1'].data.job.checkpoint.household.endpointSpentEnergy,4);
      const planningEnvelope = household.root.eldrift.records['remoteStartupPlanning/W0N1']; assert.equal(planningEnvelope.version,6); assert.equal(planningEnvelope.data.job.checkpoint.format,6);
      assert.equal(schedule.namespace.owner,'remotes'); assert.equal(schedule.namespace.version,3); assert.equal(schedule.namespace.complete,true);
      assert.equal(projection.observedAt,25); assert.equal(projection.costScope,'prospective'); assert.equal(projection.facts.workers.length,0);
      const proposal = projection.cohortProposal; assert.equal(proposal.id,'finite-cohort');
      assert.equal(proposal.expiresAt,Math.min(225,proposal.authorityExpiresAt)); assert.equal(proposal.births.length,2);
      assert.ok(proposal.births.every(birth => birth.owner.startsWith('remote-fleet:') && birth.readyAt === 0));
      assert.deepEqual(projection.steps.map(step => [step.tick,step.through,step.revision]),[[25,64,1],[30,564,2],[46,1064,3],[81,1501,4]]);
      assert.ok(projection.result); assert.equal(projection.readOnly,true);
      const assessment = projection.assessment; assert.ok(assessment); assert.equal(assessment.accepted,false);
      assert.deepEqual(assessment.rejected,['recovery-deadline','final-return']);
      assert.equal(assessment.recoveryMargin,projection.result.projectCash.constructionRecoveryMargin);
      assert.equal(assessment.deliveredEnergy,projection.result.projectCash.deliveredEnergy);
      assert.ok(assessment.deliveredEnergy > 0); assert.ok(assessment.recoveryMargin < 0); assert.equal(assessment.recoveryAt,null);
      assert.equal(projection.expiredAssessmentAbsent,true);
      assert.equal(projection.candidateCapturedAt,81); assert.equal(projection.candidateRevision,1);
      assert.equal(projection.candidateChoice.status,'complete'); assert.equal(projection.candidateChoice.selected,null);
      assert.deepEqual(projection.candidateChoice.assessments,[{ id: 'finite-cohort',...assessment }]);
      assert.equal(projection.expiredCandidateAbsent,true);
      const replacement = projection.replacementProposal; assert.equal(replacement.kind,'miner'); assert.equal(replacement.plannedBirths,3);
      const parent = projection.input.project.spawning.requests.find(request => request.id === replacement.parent);
      const born = projection.result.spawning.births.find(birth => birth.request === replacement.parent);
      const worker = projection.input.project.workers.find(worker => worker.request === replacement.parent);
      assert.equal(replacement.request.readyAt+replacement.request.body.length*3+worker.travelTicks,born.activeAt+1499-worker.retireTicks);
      assert.deepEqual(replacement.request.body,parent.body); assert.equal(replacement.request.owner,parent.owner);
      assert.deepEqual(replacement.request.placement,parent.placement); assert.deepEqual(replacement.unchangedFunding,projection.input.project.spawning.funding);
      assert.deepEqual(replacement.unchangedFlows,projection.input.project.spawning.cash.flows);
      assert.equal(projection.candidateCycleCapture.status,'complete'); assert.equal(projection.candidateCycleCapture.frames,0); assert.equal(projection.candidateCycleCapture.processed,1);
      assert.equal(projection.candidateCycleRead.status,'complete'); assert.equal(projection.candidateCycleRead.frames,0); assert.equal(projection.candidateCycleRead.processed,0);
      assert.deepEqual(projection.candidateCycleRead.assessments,projection.candidateCycleCapture.assessments);
      const incumbent = memory.incumbentProjection; assert.ok(incumbent);
      assert.ok(incumbent.observedAt >= 70 && incumbent.observedAt <= 80); assert.equal(incumbent.resumedAt,81); assert.equal(incumbent.checkpointFormat,2);
      assert.equal(incumbent.checkpointTick,10); assert.equal(incumbent.recoveredThrough,10); assert.equal(incumbent.readOnly,true);
      assert.equal(incumbent.initial.miner.expiresAt,incumbent.worker.ticksToLive); assert.equal(incumbent.initial.miner.energy,incumbent.worker.energy);
      assert.ok(incumbent.worker.energy > 0); assert.equal(incumbent.worker.usedCapacity,incumbent.worker.energy); assert.deepEqual(incumbent.openingBefore,incumbent.openingAfter);
      assert.deepEqual(incumbent.result,incumbent.uninterrupted); assert.deepEqual(incumbent.result.spawning.births,[]);
      assert.equal(incumbent.result.cash.birthEnergy,0); assert.equal(incumbent.result.openingAssets.energy,incumbent.worker.energy);
      assert.equal(projection.input.project.source.energy,projection.facts.source.energy);
      assert.equal(projection.input.project.spawning.cash.homeEnergy,projection.facts.stock.availableEnergy);
      assert.equal(projection.input.project.spawning.funding.initialEnergy,Math.min(projection.facts.stock.availableEnergy,projection.facts.stock.availableSpawnEnergy));
    }
    return;
  }
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
