const assert = require('node:assert/strict');
function verifyPaidHomeSnapshots(memory,evidence) {
  const rows = memory.pipelinePaidHomeSnapshots; evidence.paidHomeSnapshots = rows;
  assert.deepEqual(rows.map(row => row.tick),[150,151,152,153,154,155]);
  let owned = 0;
  for (const row of rows) {
    assert.equal(row.result.status,'ready'); const home = row.result.observation;
    assert.equal(new Set(home.inventories.map(inventory => inventory.id)).size,home.inventories.length);
    assert.ok(home.inventories.every(inventory => inventory.usedCapacity >= inventory.energy));
    assert.equal(home.bodies.length,home.workers.length);
    assert.equal(new Set(home.bodies.map(body => body.unit)).size,home.bodies.length);
    assert.deepEqual(row.seed.inventories,[...home.inventories,...home.bodies.map(body => body.inventory)]);
    for (const body of home.bodies) {
      const worker = home.workers.find(worker => worker.name === body.name); assert.ok(worker);
      assert.equal(body.inventory.id,body.unit); assert.equal(body.inventory.energy,worker.energy);
      assert.equal(body.inventory.usedCapacity,worker.usedCapacity); assert.equal(body.inventory.room,worker.position.room);
      assert.equal(body.inventory.active,!worker.spawning);
    }
    assert.equal(home.observedAt,row.tick); assert.equal(home.home,'W0N1'); assert.equal(home.sources.length,1);
    const all = [...home.claims.owned,...home.claims.external]; owned += home.claims.owned.length;
    assert.equal(new Set(all.map(claim => claim.id)).size,all.length);
    assert.deepEqual(row.seed.claims,all);
    assert.equal(row.seed.workers.length,home.sources.reduce((sum,source) => sum+source.couriers.length,0));
    const capacity = home.claims.pools.find(pool => pool.pool === 'logistics:'+JSON.stringify(['capacity',home.endpoint.id]));
    assert.equal(capacity.owned+capacity.external,home.endpoint.claimedCapacity);
    assert.equal(home.endpoint.availableCapacity,Math.max(0,home.endpoint.freeCapacity-home.endpoint.claimedCapacity));
    for (const source of home.sources) {
      assert.equal(source.miners.length,1); assert.equal(source.couriers.length,2);
      assert.equal(source.observation.observedAt,row.tick);
      const station = source.observation.station.facts;
      assert.equal(home.inventories.find(inventory => inventory.id === station.id).energy,station.energy);
      assert.ok(source.claimIds.every(id => all.some(claim => claim.id === id)));
      for (const courier of source.couriers) {
        assert.equal(courier.route.cursor.observedAt,row.tick); assert.equal(courier.route.cursor.requestedAt,null);
        assert.equal(courier.opening.observed.energy,courier.route.energy);
        assert.equal(courier.opening.observed.fatigue,courier.route.fatigue);
        assert.deepEqual(courier.opening.observed.position,courier.route.cursor.position);
        const worker = home.workers.find(worker => worker.name === courier.paid.request); assert.ok(worker); assert.equal(worker.energy,courier.route.energy);
        const body = home.bodies.find(body => body.unit === courier.opening.observed.unit); assert.ok(body);
        assert.equal(body.inventory.capacity,courier.paid.capacity);
        const seed = row.seed.workers.find(worker => worker.name === courier.paid.request); assert.ok(seed);
        assert.equal(seed.source,source.cohort.source); assert.equal(seed.unit,courier.opening.observed.unit);
        assert.deepEqual(seed.task,courier.opening.observed.task?.record ?? null);
        assert.equal(seed.remaining,courier.opening.continuation.requestRemaining);
        const effect = courier.opening.reflectedEffect;
        if (effect) {
          assert.equal(effect.projectedIncome,0); assert.equal(seed.journal.acknowledged,false);
          assert.deepEqual(seed.journal.result,{ status: 'observed',amount: effect.amount });
          if (effect.kind === 'transfer' && effect.amount > 0) {
            assert.deepEqual(seed.receipts.filter(receipt => receipt.id === effect.id),[{ id: effect.id,amount: effect.amount }]);
          }
        }
      }
    }
  }
  assert.ok(owned > 0,'actual selected task bookings remain distinct from outside liabilities');
}
module.exports = { verifyPaidHomeSnapshots };
