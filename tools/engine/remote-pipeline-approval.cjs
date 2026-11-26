const assert = require('node:assert/strict');
function verifyPipelineApproval(memory,evidence) {
  const approved = memory.eldrift.records['remoteStartupApprovals/W0N1'], scratch = memory.eldrift.records['remoteStartupPlanning/W0N1'];
  evidence.pipelineApproval = { approved,scratch,discardedAt: memory.pipelineApprovalResetAt };
  assert.equal(memory.pipelineApprovalResetAt,40); assert.equal(scratch.data.job,null);
  assert.equal(approved.owner,'remotes'); assert.equal(approved.version,1); assert.equal(approved.data.approvals.length,1);
  assert.equal(approved.data.approvals[0].approvedAt,32); assert.equal(approved.data.approvals[0].job.checkpoint.tick,768);
  assert.deepEqual(memory.pipelineEconomicChecks.filter(check => check.allowed).map(check => check.tick),[32,53,65]);
}
module.exports = { verifyPipelineApproval };
