const assert = require('node:assert/strict');
function verifyNativeLaborCancel(proof) {
  assert.equal(proof.cancel,true); assert.equal(proof.actorReceipt,undefined); assert.equal(proof.actorResult,undefined);
  const failure = proof.actorFailure; assert.ok(failure);
  assert.equal(failure.request,proof.proposal.input.request.id); assert.equal(failure.reason,'labor-authority');
  assert.equal(failure.failedAt,11); assert.equal(failure.resolvedAt,12);
  assert.equal(failure.picked,3); assert.equal(failure.spent,0); assert.equal(failure.returned,3); assert.equal(failure.retainedEnergy,0);
  assert.equal(proof.failureReloadedAt,13); assert.equal(proof.actorReloadAt,11); assert.equal(proof.stagedTask.restoredAt,14); assert.equal(proof.stagedTask.readOnly,true);
  for (const row of proof.rows.filter(row => row.tick > 1 && row.tick <= 11)) assert.deepEqual(row.actual,row.expected);
  assert.deepEqual(proof.rows.at(-1).actual,{ spawn: 125,endpoint: 1000,cargo: 0,bank: 1125,progress: 0 });
  assert.equal(proof.rows.find(row => row.tick === 12).actual.bank-proof.rows.find(row => row.tick === 12).expected.bank,3);
  assert.equal(proof.result.cash.birthEnergy,200); assert.equal(proof.result.cash.ambientEnergy,25); assert.equal(proof.result.cash.deliveredEnergy,0);
  // Retain the old prediction visibly; cancelled work invalidates it rather than inventing matching income.
  assert.equal(proof.result.cash.homeConstructionEnergy,3); assert.equal(proof.planning.endingEnergy,1122);
  const cargo = { pool: 'logistics:'+JSON.stringify(['capacity',failure.unit]),amount: 50 };
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 10).allocations,[cargo,{ pool: 'logistics:'+JSON.stringify(['stock',proof.proposal.input.source,'energy']),amount: 3 }]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 11).allocations,[cargo,{ pool: 'logistics:'+JSON.stringify(['capacity',proof.proposal.input.source]),amount: 3 }]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 12).allocations,[]);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[[1,'birth',200,0],[10,'pickup',3,0],[11,'return',3,0]]);
}
module.exports = { verifyNativeLaborCancel };
