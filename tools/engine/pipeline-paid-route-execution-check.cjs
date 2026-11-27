const assert = require('node:assert/strict');
function verifyPaidRouteExecution(memory,evidence) {
  const proof = memory.pipelineRouteExecution; evidence.paidRouteExecution = proof;
  assert.ok(proof); assert.equal(proof.releasedAt,181);
  assert.equal(proof.rows.length,64);
  for (let tick = 150; tick <= 181; tick++) {
    const rows = proof.rows.filter(row => row.tick === tick); assert.equal(rows.length,2);
    for (const row of rows) { assert.equal(row.status,'ready'); assert.equal(row.activatedAt,150); }
  }
  assert.ok(proof.rows.some(row => row.index > 0),'actual observed route progress');
  assert.ok(proof.rows.some(row => row.leg === 'loaded'),'collection transitions to loaded circuit');
  assert.ok(proof.rows.some(row => row.leg === 'empty'),'delivery transitions to empty circuit');
  assert.ok(proof.moves.some(row => row.status === 'running'),'productive transport calls activated route movement');
}
module.exports = { verifyPaidRouteExecution };
