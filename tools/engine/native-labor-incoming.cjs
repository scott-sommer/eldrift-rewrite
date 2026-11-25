const assert = require('node:assert/strict');
function verifyNativeLaborIncoming(proof) {
  assert.equal(proof.actorReceipt,undefined); assert.equal(proof.actorResult,undefined);
  const failure = proof.actorFailure; assert.ok(failure);
  assert.equal(failure.request,proof.proposal.input.request.id); assert.equal(failure.reason,'labor-authority');
  assert.equal(failure.failedAt,10); assert.equal(failure.resolvedAt,10);
  assert.equal(failure.picked,0); assert.equal(failure.spent,0); assert.equal(failure.returned,0); assert.equal(failure.retainedEnergy,0);
  assert.equal(proof.actorReloadAt,11); assert.equal(proof.failureReloadedAt,13); assert.equal(proof.incomingSettledAt,11);
  assert.equal(proof.stagedTask.restoredAt,14); assert.equal(proof.stagedTask.readOnly,true);
  const claim = proof.incomingClaim;
  assert.deepEqual(claim,{ id: 'fixture-incoming',owner: 'fixture-hauling',holder: 'labor-donor',scope: 'fixture-incoming',expiresAt: 26,allocations: [{ pool: 'logistics:'+JSON.stringify(['capacity',failure.unit]),amount: 1 }] });
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 10).allocations,claim.allocations);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 11).allocations,[]);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === 12).allocations,[]);
  assert.equal(proof.rows.find(row => row.tick === 10).actual.cargo,0);
  assert.equal(proof.rows.find(row => row.tick === 11).actual.cargo,1);
  assert.deepEqual(proof.rows.at(-1).actual,{ spawn: 125,endpoint: 1000,cargo: 1,bank: 1126,progress: 0 });
  // The donor starts with1 fixture energy outside the quoted household. Its arrival is not labor output.
  assert.equal(proof.rows.at(-1).actual.bank,1300-200+25+1);
  assert.equal(proof.result.cash.birthEnergy,200); assert.equal(proof.result.cash.deliveredEnergy,0);
  assert.equal(proof.result.cash.homeConstructionEnergy,3); assert.equal(proof.planning.endingEnergy,1122);
  assert.equal(proof.planning.assessment.accepted,false);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[[1,'birth',200,0],[10,'incoming',1,0]]);
}
module.exports = { verifyNativeLaborIncoming };
