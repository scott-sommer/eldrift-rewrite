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
  assert.ok(rows.some(row => row.probe.paidCouriers.some(item => item.result.observation.stage === 'pending')),'real pending native effects must remain explicit');
}
module.exports = { verifyPaidCourierObservations };
