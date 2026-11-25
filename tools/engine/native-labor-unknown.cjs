const assert = require('node:assert/strict');
function verifyNativeLaborUnknown(proof) {
  assert.equal(proof.actorReceipt,undefined); assert.equal(proof.actorResult,undefined); assert.equal(proof.incomingClaim,undefined);
  const failure = proof.actorFailure; assert.ok(failure);
  assert.equal(failure.request,proof.proposal.input.request.id); assert.equal(failure.reason,'labor-settlement');
  assert.equal(failure.failedAt,11); assert.equal(failure.resolvedAt,11);
  assert.equal(failure.picked,0); assert.equal(failure.spent,0); assert.equal(failure.returned,0); assert.equal(failure.retainedEnergy,4);
  assert.equal(proof.incomingSettledAt,11); assert.equal(proof.actorReloadAt,11); assert.equal(proof.failureReloadedAt,13);
  assert.equal(proof.stagedTask.restoredAt,14); assert.equal(proof.stagedTask.readOnly,true);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 10).allocations,[{ pool: 'logistics:'+JSON.stringify(['capacity',failure.unit]),amount: 50 },{ pool: 'logistics:'+JSON.stringify(['stock',proof.proposal.input.source,'energy']),amount: 3 }]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 11).allocations,[]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 12).allocations,[]);
  assert.equal(proof.rows.find(row => row.tick === 10).actual.cargo,0); assert.equal(proof.rows.find(row => row.tick === 11).actual.cargo,4);
  assert.deepEqual(proof.rows.at(-1).actual,{ spawn: 125,endpoint: 997,cargo: 4,bank: 1126,progress: 0 });
  assert.equal(proof.rows.at(-1).actual.bank,1300-200+25+1);
  assert.equal(proof.result.cash.birthEnergy,200); assert.equal(proof.result.cash.deliveredEnergy,0);
  assert.equal(proof.result.cash.homeConstructionEnergy,3); assert.equal(proof.planning.endingEnergy,1122); assert.equal(proof.planning.assessment.accepted,false);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[[1,'birth',200,0],[10,'unreserved',1,0],[10,'pickup',3,0]]);
}
module.exports = { verifyNativeLaborUnknown };
