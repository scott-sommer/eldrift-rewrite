const { verifyPaidHomeSnapshots } = require('./pipeline-paid-home-check.cjs');
const { verifyPaidRouteExecution } = require('./pipeline-paid-route-execution-check.cjs');
const { verifyPaidContinuations } = require('./pipeline-paid-continuation-check.cjs');
const assert = require('node:assert/strict');
function verifyPaidCourierObservations(memory,evidence) {
  const rows = memory.pipelineRows.filter(row => row.probe?.paidCouriers);
  evidence.paidCourierObservations = rows.map(row => ({ tick: row.tick,observations: row.probe.paidCouriers }));
  assert.deepEqual(rows.map(row => row.tick),[150,151,152,153,154,155]);
  for (const row of rows) {
    assert.equal(row.probe.paidCouriers.length,2);
    for (const item of row.probe.paidCouriers) {
      assert.equal(item.result.status,'ready'); assert.equal(item.result.observation.observedAt,row.tick);
      assert.ok(item.result.observation.unit); assert.ok(item.result.observation.position.room);
    }
  }
  verifyOpening(rows,evidence);
  verifyResolutions(memory,evidence);
  verifyPaidContinuations(memory,evidence);
  verifyPaidRouteExecution(memory,evidence);
  verifyPaidHomeSnapshots(memory,evidence);
  assert.ok(rows.some(row => row.probe.paidCouriers.some(item => item.result.observation.stage === 'pending')),'real pending native effects must remain explicit');
}
module.exports = { verifyPaidCourierObservations };

function verifyOpening(rows,evidence) {
  evidence.paidSourceObservations = rows.map(row => ({ tick: row.tick,sources: row.probe.paidSources,miners: row.probe.paidMiners }));
  for (const row of rows) {
    assert.equal(row.probe.paidSources.length,1); assert.equal(row.probe.paidMiners.length,1);
    const source = row.probe.paidSources[0].result,miner = row.probe.paidMiners[0].result;
    assert.equal(source.status,'ready'); assert.equal(miner.status,'ready');
    assert.equal(source.observation.observedAt,row.tick); assert.equal(miner.observation.observedAt,row.tick);
    assert.equal(source.observation.station.facts.status,'ready');
    assert.ok(source.observation.containerSpace.usedCapacity >= source.observation.station.facts.energy);
    assert.equal(miner.observation.stage,'station'); assert.equal(miner.observation.assigned,true);
    const position = source.observation.station;
    assert.deepEqual(miner.observation.position,{ room: position.room,x: position.x,y: position.y });
    const observed = source.observation.workers.find(worker => worker.name === miner.observation.name); assert.ok(observed);
    assert.equal(observed.energy,miner.observation.energy);
  }
}

function verifyResolutions(memory,evidence) {
  const rows = memory.pipelinePaidOpeningResolutions; evidence.paidOpeningResolutions = rows;
  assert.deepEqual(rows.map(row => row.tick),[150,151,152,153,154,155]);
  const effects = [];
  for (const row of rows) {
    assert.equal(row.openings.length,2);
    for (const item of row.openings) {
      assert.equal(item.result.status,'ready'); const opening = item.result.opening;
      assert.equal(opening.observed.observedAt,row.tick);
      if (!opening.reflectedEffect) continue;
      const effect = opening.reflectedEffect; effects.push(effect);
      assert.equal(effect.issuedAt,row.tick-1); assert.equal(effect.projectedIncome,0);
      assert.equal(opening.observed.journal.acknowledged,false);
      assert.equal(opening.continuation.readyAt,row.tick+(effect.kind === 'transfer' ? 1 : 0));
    }
  }
  assert.ok(effects.some(effect => effect.kind === 'withdraw' && effect.amount > 0));
  assert.ok(effects.some(effect => effect.kind === 'transfer' && effect.amount > 0));
}
