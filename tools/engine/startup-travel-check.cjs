const assert = require('node:assert/strict');
function verifyStartupTravel(probes) {
  assert.equal(probes.length,2);
  const [first,last] = probes;
  assert.equal(first.tick,149); assert.equal(first.beforeLegs,0); assert.equal(first.afterLegs,2); assert.equal(first.afterRevision,2);
  assert.deepEqual(first.result,{ status: 'deferred',reason: 'leg-budget',completedLegs: 2 });
  assert.equal(last.tick,150); assert.equal(last.beforeLegs,2); assert.equal(last.afterLegs,5); assert.equal(last.afterRevision,5);
  const result = last.result; assert.equal(result.status,'complete'); assert.equal(result.observedAt,150);
  const plan = result.plan;
  assert.deepEqual(result.rooms,['W0N1','E0N1']); assert.equal(result.facts.observedAt,150);
  assert.deepEqual(result.legs.map(leg => leg.kind),['miner-approach','miner-return','courier-approach','courier-empty','courier-loaded']);
  const targets = [plan.station,plan.endpoint.deposit,plan.collection,plan.collection,plan.endpoint.deposit];
  result.legs.forEach((leg,index) => { assert.deepEqual(leg.arrival,targets[index]); assert.ok(leg.ticks > 0 && Number.isSafeInteger(leg.ticks)); });
  assert.equal(result.operations,result.legs.reduce((sum,leg) => sum+leg.operations,0));
  assert.ok(result.operations > 0);
  assert.notDeepEqual(plan.spawn.exit,plan.endpoint.deposit);
}
module.exports = { verifyStartupTravel };
