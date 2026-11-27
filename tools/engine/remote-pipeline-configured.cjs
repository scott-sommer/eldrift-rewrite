const { verifySharedHome } = require('./pipeline-shared-home.cjs');
const assert = require('node:assert/strict');
function verifyConfiguredPipeline(memory,evidence) {
  const planning = memory.pipelineConfiguredPlanning, approval = memory.pipelineConfiguredApproval, proof = memory.pipelineCalibration, variant = memory.pipelineConfiguredVariant;
  evidence.pipelineConfigured = { trace: memory.pipelineStartupTrace,pathProbe: memory.pipelinePathProbe,revisitRequestedAt: memory.pipelineConfiguredRevisitRequestedAt,variant,planning,approval,changes: memory.pipelineConfiguredChanges,rejected: memory.pipelineConfiguredRejected,rows: memory.pipelineRows,births: memory.pipelineBirths,job: memory.eldrift.records['remoteStartupPlanning/W0N1'],queue: memory.eldrift.records['spawning/W0N1'],approvals: memory.eldrift.records['remoteStartupApprovals/W0N1'] };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  if (variant === 'shared') return verifySharedHome(memory,evidence);
  if (variant === 'refused') return verifyRefused(memory,evidence);
  assert.ok(planning?.length > 10,'forecast must resume over multiple native ticks');
  const frames = variant === 'budget' ? 20 : 32, horizon = variant === 'changed' ? 650 : 767, lead = variant === 'budget' ? 100 : 30;
  for (const epoch of new Set(planning.map(row => row.observedAt))) {
    const rows = planning.filter(row => row.observedAt === epoch); assert.ok(rows[0].through > 0 && rows[0].through <= frames);
    for (let i=1;i<rows.length;i++) assert.ok(rows[i].through-rows[i-1].through > 0 && rows[i].through-rows[i-1].through <= frames);
  }
  assert.equal(planning.at(-1).through,horizon+1);
  if (variant !== 'budget') { assert.ok(planning.some(row => row.tick < 41)); assert.ok(planning.some(row => row.tick > 41)); }
  assert.ok(approval.approvedAt > approval.observedAt && approval.approvedAt < approval.observedAt+lead);
  if (variant === 'changed') {
    assert.deepEqual(memory.pipelineConfiguredChanges,[45,70]); assert.ok(approval.observedAt > 70);
    for (const after of [0,45,70]) assert.ok(planning.some(row => row.observedAt > after && (after > 0 || row.observedAt < 45)));
  } else assert.equal(new Set(planning.map(row => row.observedAt)).size,1);
  const births = proof.input.project.spawning.requests.filter(request => request.admission?.kind === 'remote-startup');
  assert.equal(births.length,3); assert.ok(births.every(request => request.readyAt === lead && request.admission.observedAt === approval.observedAt));
  assert.equal(memory.eldrift.records['spawning/W0N1'].version,5);
}
function verifyRefused(memory,evidence) {
  const rows = memory.pipelineRows, births = Object.values(memory.pipelineBirths), last = rows.at(-1);
  evidence.pipelineConfigured.rows = rows; evidence.pipelineConfigured.births = memory.pipelineBirths;
  assert.equal(rows.length,180); assert.equal(memory.pipelineConfiguredRevisitRequestedAt,70);
  assert.ok(rows.some(row => row.tick < 70 && !row.visible) && rows.some(row => row.tick > 70 && row.visible),'actual scout must lose and restore source vision');
  assert.ok(memory.pipelineConfiguredRejected.length >= 2,'both completed observed proposals must be refused');
  assert.ok(memory.pipelineConfiguredRejected.some(row => row.observedAt > 70),'fresh rejection must follow the explicit revisit mission');
  assert.ok(new Set(memory.pipelineConfiguredPlanning.map(row => row.observedAt)).size >= 2,'a fresh proposal must follow the first deadline when vision returns');
  assert.equal(memory.pipelineCalibration,undefined); assert.equal(memory.pipelineConfiguredApproval,undefined);
  assert.ok(!memory.eldrift.records['remoteStartupApprovals/W0N1'] || memory.eldrift.records['remoteStartupApprovals/W0N1'].data.approvals.length === 0);
  assert.ok(births.every(birth => !['miner','courier','reserver'].includes(birth.family))); assert.ok(rows.every(row => row.income === 0 && row.birthCost <= 200 && row.remotePending === 0));
  assert.equal(last.homeEnergy,10300-200-200-3); assert.equal(last.quantityClaims,0); assert.equal(last.miningClaims,0);
  for (const row of rows) { assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel); }
}
module.exports = { verifyConfiguredPipeline };
