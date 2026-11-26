const assert = require('node:assert/strict');
function verifyConfiguredPipeline(memory,evidence) {
  const planning = memory.pipelineConfiguredPlanning, approval = memory.pipelineConfiguredApproval, proof = memory.pipelineCalibration;
  evidence.pipelineConfigured = { planning,approval,queue: memory.eldrift.records['spawning/W0N1'] };
  assert.ok(planning.length > 10,'forecast must resume over multiple native ticks');
  assert.equal(planning[0].through,32);
  for (let i=1;i<planning.length;i++) { assert.equal(planning[i].observedAt,planning[0].observedAt); assert.ok(planning[i].through-planning[i-1].through > 0 && planning[i].through-planning[i-1].through <= 32); }
  assert.equal(planning.at(-1).through,768); assert.ok(planning.some(row => row.tick < 41)); assert.ok(planning.some(row => row.tick > 41));
  assert.ok(approval.approvedAt > approval.observedAt && approval.approvedAt < approval.observedAt+30);
  const births = proof.input.project.spawning.requests.filter(request => request.admission?.kind === 'remote-startup');
  assert.equal(births.length,3); assert.ok(births.every(request => request.readyAt === 30 && request.admission.observedAt === approval.observedAt));
  assert.equal(memory.eldrift.records['spawning/W0N1'].version,5);
}
module.exports = { verifyConfiguredPipeline };
