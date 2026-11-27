const { verifySharedReceipts } = require('./pipeline-shared-receipts.cjs');
const assert = require('node:assert/strict');
function verifySharedHome(memory,evidence) {
  const approvals = memory.pipelineSharedApprovals ?? [], rows = memory.pipelineRows, births = memory.pipelineBirths, last = rows.at(-1);
  evidence.sharedHome = { approvals,rows,births,remoteReceipts: memory.pipelineRemote,serviceCalls: memory.pipelineServiceCalls,reloads: memory.stampReloads };
  assert.equal(rows.length,1000); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(new Set(approvals.map(row => row.source)).size,2,'both native sources must receive independent current approvals');
  assert.equal(approvals.length,2,'two finite cohorts must not churn through cancellation/reapproval');
  const ordered = [...approvals].sort((a,b) => a.observedAt-b.observedAt), firstEnd = Math.max(...ordered[0].births.map(birth => birth.startAt));
  assert.ok(ordered[1].observedAt > firstEnd,'second observation must follow payment of the first home cohort');
  for (const approval of approvals) for (const birth of approval.births) {
    const actual = births[birth.request]; assert.ok(actual,'every priced birth must actually occur');
    assert.equal(actual.owner,birth.owner); assert.equal(actual.cost,birth.cost);
    assert.equal(actual.seenAt,birth.startAt); assert.equal(actual.activeAt,birth.activeAt);
  }
  const firstCost = ordered[0].births.reduce((sum,birth) => sum+birth.cost,0);
  assert.ok(ordered[1].homeEnergy < ordered[0].homeEnergy,'second proposal must observe the already-spent shared home bank');
  assert.ok(firstCost > 0); assert.ok(last.income > last.birthCost+memory.pipelineLabor.birthCost+memory.pipelineLabor.receipt.spent);
  for (const approval of approvals) {
    const keys = Object.entries(memory.pipelineRemote.bindings).filter(([,binding]) => binding.includes(approval.source)).map(([id]) => id);
    assert.ok(keys.some(id => memory.pipelineRemote.amounts[id] > 0),'each source must produce settled income');
  }
  assert.ok(Object.values(memory.pipelineServiceCalls).every(row => row.matches));
  assert.ok(last.stopped >= Math.max(800,...approvals.map(row => row.cutoff+1)));
  assert.equal(last.lease,null); assert.equal(last.remotePending,0); assert.equal(last.quantityClaims,0); assert.equal(last.miningClaims,0);
  assert.ok(last.units.filter(unit => ['miner','courier'].includes(unit.family)).every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks === 0 && !unit.spawning));
  for (const row of rows) { assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel); }
  assert.equal(last.homeEnergy+last.units.reduce((sum,unit) => sum+unit.cargo,0)+last.birthCost+memory.pipelineLabor.birthCost+memory.pipelineLabor.receipt.spent-last.income,rows[0].homeEnergy);
  assert.deepEqual(memory.stampReloads,[21,41,311,591,861]);
  verifySharedReceipts(memory,evidence);
}
module.exports = { verifySharedHome };
