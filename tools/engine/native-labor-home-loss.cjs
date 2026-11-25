const assert = require('node:assert/strict');
function verifyNativeLaborHomeLoss(proof) {
  assert.equal(proof.actorReceipt,undefined); assert.equal(proof.actorResult,undefined);
  const failure = proof.actorFailure; assert.ok(failure);
  assert.equal(failure.request,proof.proposal.input.request.id); assert.equal(failure.reason,'labor-home-lost');
  assert.equal(failure.failedAt,11); assert.equal(failure.resolvedAt,11);
  assert.equal(failure.picked,3); assert.equal(failure.spent,0); assert.equal(failure.returned,0); assert.equal(failure.retainedEnergy,3);
  assert.equal(proof.actorReloadAt,11); assert.equal(proof.failureReloadedAt,13);
  assert.equal(proof.stagedTask.restoredAt,14); assert.equal(proof.stagedTask.readOnly,true);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 11).allocations,[]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 12).allocations,[]);
  assert.deepEqual(proof.rows.at(-1).actual,{ spawn: 110,endpoint: 997,cargo: 3,bank: 1110,progress: 0 });
  assert.ok(proof.rows.filter(row => row.tick >= 11).every(row => row.actual.spawn === 110));
  assert.equal(proof.rows.at(-1).actual.bank,1300-200+10);
  // The old forecast assumes25 passive income; actual controller loss stops it after10.
  assert.equal(proof.result.cash.ambientEnergy,25);
  assert.equal(proof.result.cash.deliveredEnergy,0); assert.equal(proof.planning.assessment.accepted,false);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[[1,'birth',200,0],[10,'pickup',3,0]]);
}
module.exports = { verifyNativeLaborHomeLoss };
