const assert = require('node:assert/strict');
function verifyNativeLaborInterruption(proof,fault) {
  assert.equal(proof.fault,fault); assert.equal(proof.interruptedAt,10); assert.equal(proof.reconstructedAt,10);
  if (fault !== 'before') return;
  assert.equal(proof.actorReceipt,undefined); assert.equal(proof.actorResult,undefined);
  const failure = proof.actorFailure; assert.ok(failure);
  assert.equal(failure.request,proof.proposal.input.request.id); assert.equal(failure.reason,'labor-settlement');
  assert.equal(failure.failedAt,11); assert.equal(failure.resolvedAt,11);
  assert.equal(failure.picked,0); assert.equal(failure.spent,0); assert.equal(failure.returned,0); assert.equal(failure.retainedEnergy,0);
  assert.equal(proof.failureReloadedAt,13); assert.equal(proof.actorReloadAt,11);
  assert.equal(proof.stagedTask.restoredAt,14); assert.equal(proof.stagedTask.readOnly,true);
  for (const row of proof.rows.filter(row => row.tick > 1 && row.tick <= 10)) assert.deepEqual(row.actual,row.expected);
  assert.deepEqual(proof.rows.at(-1).actual,{ spawn: 125,endpoint: 1000,cargo: 0,bank: 1125,progress: 0 });
  assert.equal(proof.result.cash.birthEnergy,200); assert.equal(proof.result.cash.ambientEnergy,25); assert.equal(proof.result.cash.deliveredEnergy,0);
  // The unexecuted pickup invalidates this forecast; retain it as a visible counterfactual.
  assert.equal(proof.result.cash.homeConstructionEnergy,3); assert.equal(proof.planning.endingEnergy,1122);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 10).allocations,[{ pool: 'logistics:'+JSON.stringify(['capacity',failure.unit]),amount: 50 }]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 11).allocations,[]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 12).allocations,[]);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[[1,'birth',200,0]]);
}
module.exports = { verifyNativeLaborInterruption };
