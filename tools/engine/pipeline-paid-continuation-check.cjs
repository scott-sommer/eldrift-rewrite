const assert = require('node:assert/strict');
function verifyPaidContinuations(memory,evidence) {
  const rows = memory.pipelinePaidContinuations;
  evidence.paidContinuations = rows;
  assert.deepEqual(rows.map(row => row.tick),[97,150,151,152,153,154,155]);
  const compiled = []; let revision = 0;
  for (const row of rows) {
    assert.equal(row.continuations.length,2);
    for (const item of row.continuations) {
      assert.equal(item.result.status,'ready');
      const value = item.result.compilation; compiled.push(value);
      const activation = item.activation; assert.equal(activation.status,'ready');
      assert.equal(activation.revision,++revision); assert.equal(activation.activatedAt,row.tick);
      assert.equal(activation.name,value.initial.id); assert.equal(activation.unit,value.unit); assert.equal(activation.source,item.source);
      assert.equal(activation.phase,value.initial.phase); assert.equal(activation.readyAt,value.basis.continuation.readyAt);
      assert.equal(activation.cursor,value.initial.remainingSpawnTicks > 0 ? null : 0);
      assert.equal(activation.routeVersion,value.routeVersion); assert.equal(activation.topologyVersion,value.topologyVersion);
      assert.deepEqual(activation.writeKeys,['remoteStartupRoutes/W0N1']);
      assert.equal(value.observedAt,row.tick);
      assert.equal(value.source,item.source);
      assert.equal(value.initial.id,value.basis.observed.name);
      assert.equal(value.initial.energy,value.basis.observed.energy);
      assert.equal(value.opening.fatigue,value.basis.observed.fatigue);
      assert.equal(value.opening.readyAt,value.basis.continuation.readyAt-row.tick);
      assert.equal(value.initial.expiresAt,value.basis.observed.expiresAt-row.tick);
      assert.equal(value.initial.remainingSpawnTicks,Math.max(0,value.basis.observed.activeAt-row.tick));
      assert.ok(value.terrain.length > 0);
      assert.ok(value.routeVersion); assert.ok(value.topologyVersion);
      assert.equal(value.route.request,value.initial.id);
      assert.equal(value.opening.plan.order,value.initial.id);
    }
  }
  assert.ok(compiled.some(value => value.initial.remainingSpawnTicks > 0),'actual paid incubation must be represented');
  assert.ok(compiled.some(value => value.initial.energy > 0 && value.initial.phase === 'deliver'),'actual loaded incumbent must be represented');
  assert.ok(compiled.some(value => value.basis.reflectedEffect?.kind === 'withdraw'));
  assert.ok(compiled.some(value => value.basis.reflectedEffect?.kind === 'transfer'));
}
module.exports = { verifyPaidContinuations };
