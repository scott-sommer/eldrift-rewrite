const assert = require('node:assert/strict');
function verifyPipelineEconomicChange(memory,evidence) {
  const proof = memory.pipelineCalibration, checks = memory.pipelineEconomicChecks, rows = memory.pipelineRows, last = rows.at(-1);
  evidence.pipelineEconomicChange = { proof,checks,rows,births: memory.pipelineBirths,changes: memory.pipelineEconomicChanges };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]); assert.equal(rows.length,180);
  assert.ok(proof?.economic); assert.deepEqual(memory.pipelineEconomicChanges,[50,60,120]);
  const births = Object.values(memory.pipelineBirths).filter(birth => ['miner','courier'].includes(birth.family));
  assert.equal(births.length,1); assert.equal(births[0].family,'miner'); assert.equal(births[0].seenAt,32);
  assert.deepEqual(checks.filter(check => check.allowed).map(check => check.tick),[32]);
  assert.ok(checks.some(check => check.tick >= 50 && check.tick < 60 && !check.bindingMatches && !check.allowed));
  assert.ok(checks.some(check => check.tick === 65 && check.request === 'ed-W0N1-6' && check.bindingMatches && !check.allowed),'restored policy cannot authorize a later slot after its predecessor was missed');
  assert.equal(last.stopped,120); assert.equal(last.lease,null); assert.equal(last.remotePending,0); assert.equal(last.quantityClaims,0); assert.equal(last.miningClaims,0);
  assert.ok(last.units.filter(unit => ['miner','courier'].includes(unit.family)).every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks === 0));
  for (const row of rows) { assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel); }
}
module.exports = { verifyPipelineEconomicChange };
