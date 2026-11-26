const assert = require('node:assert/strict');
function verifyPipelineEconomicChange(memory,evidence) {
  const proof = memory.pipelineCalibration, checks = memory.pipelineEconomicChecks, rows = memory.pipelineRows, last = rows.at(-1);
  evidence.pipelineEconomicChange = { proof,checks,rows,births: memory.pipelineBirths,changes: memory.pipelineEconomicChanges,maintenance: memory.pipelineEconomicMaintenance };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]); assert.equal(rows.length,180);
  assert.ok(proof?.economic); assert.deepEqual(memory.pipelineEconomicChanges,[50,60,120]);
  const births = Object.values(memory.pipelineBirths).filter(birth => ['miner','courier'].includes(birth.family));
  assert.equal(births.length,1); assert.equal(births[0].family,'miner'); assert.equal(births[0].seenAt,32);
  assert.deepEqual(checks.filter(check => check.allowed).map(check => check.tick),[32]);
  const invalid = memory.pipelineEconomicMaintenance.find(row => row.tick === 50);
  assert.equal(invalid.reason,'binding'); assert.equal(invalid.bindingMatches,false);
  assert.deepEqual(invalid.cancelled,['ed-W0N1-5','ed-W0N1-6']); assert.deepEqual(invalid.occupied,['ed-W0N1-4']); assert.deepEqual(invalid.conflicts,[]);
  assert.ok(memory.pipelineEconomicMaintenance.some(row => row.tick === 60 && row.reason === 'cohort-progress' && row.bindingMatches && row.cancelled.length === 0),'restored settings cannot revive a missed cohort');
  assert.equal(last.stopped,120); assert.equal(last.lease,null); assert.equal(last.remotePending,0); assert.equal(last.quantityClaims,0); assert.equal(last.miningClaims,0);
  assert.ok(last.units.filter(unit => ['miner','courier'].includes(unit.family)).every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks === 0));
  for (const row of rows) { assert.deepEqual(row.unrelated,rows[0].unrelated); assert.deepEqual(row.sentinel,rows[0].sentinel); }
}
module.exports = { verifyPipelineEconomicChange };
