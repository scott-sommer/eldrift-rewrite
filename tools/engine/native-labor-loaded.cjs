const assert = require('node:assert/strict');
function verifyNativeLaborLoaded(proof) {
  assert.equal(proof.cancel,true); assert.equal(proof.actorReceipt,undefined); assert.equal(proof.actorResult,undefined);
  const failure = proof.actorFailure; assert.ok(failure);
  assert.equal(failure.reason,'labor-authority'); assert.equal(failure.failedAt,12);
  assert.ok(failure.resolvedAt > 13 && failure.resolvedAt < 17);
  assert.equal(failure.picked,3); assert.equal(failure.spent,0); assert.equal(failure.returned,3); assert.equal(failure.retainedEnergy,0);
  assert.equal(proof.failureReloadedAt,17); assert.equal(proof.actorReloadAt,11);
  assert.equal(proof.stagedTask.restoredAt,18); assert.equal(proof.stagedTask.readOnly,true);
  const outbound = proof.rows.find(row => row.tick === 12);
  assert.equal(outbound.actual.cargo,3); assert.ok(outbound.position.fatigue > 0);
  assert.notDeepEqual([outbound.position.x,outbound.position.y],[14,15]);
  const refunded = proof.rows.find(row => row.tick === failure.resolvedAt);
  assert.deepEqual([refunded.position.x,refunded.position.y],[14,15]);
  assert.deepEqual(proof.rows.at(-1).actual,{ spawn: 125,endpoint: 1000,cargo: 0,bank: 1125,progress: 0 });
  const cargo = { pool: 'logistics:'+JSON.stringify(['capacity',failure.unit]),amount: 50 };
  for (const row of proof.actorClaims.filter(row => row.tick >= 11 && row.tick < failure.resolvedAt)) assert.deepEqual(row.allocations[0],cargo);
  assert.deepEqual(proof.actorClaims.find(row => row.tick === failure.resolvedAt).allocations,[]);
  assert.equal(proof.result.cash.birthEnergy,200); assert.equal(proof.result.cash.ambientEnergy,25); assert.equal(proof.result.cash.deliveredEnergy,0);
  assert.equal(proof.result.cash.homeConstructionEnergy,3); assert.equal(proof.planning.endingEnergy,1122);
  assert.equal(proof.planning.resumedAt,18); assert.equal(proof.planning.assessment.accepted,false);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.action,call.energy,call.code]),[[1,'birth',200,0],[10,'pickup',3,0],[failure.resolvedAt-1,'return',3,0]]);
}
module.exports = { verifyNativeLaborLoaded };
