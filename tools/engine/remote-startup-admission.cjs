const assert = require('node:assert/strict');
/** Fast ordinary-startup success guard; no prebuilt container, witness, workforce or stale-request injection. */
function verifyStartupAdmission(memory,rows) {
  const last = rows.at(-1), births = Object.values(memory.pipelineBirths);
  assert.equal(last.probe.staleAt,null); assert.equal(last.stopped,null);
  assert.ok(last.visible && last.lease?.sources === 1);
  const miners = births.filter(birth => birth.family === 'miner');
  assert.equal(miners.length,1); assert.ok(miners[0].activeAt < last.tick);
  assert.ok(births.every(birth => ['distributor','scout','miner'].includes(birth.family)));
  assert.ok(births.every(birth => birth.activeAt !== undefined),'all paid births must become active');
  assert.equal((memory.startupCalls ?? []).filter(call => call.family === 'miner' && call.code === 0).length,1);
  assert.ok(last.probe.construction > 0 && last.probe.construction < 5000);
  assert.ok(!last.probe.sites.some(site => site.complete));
  assert.ok(last.units.some(unit => unit.family === 'miner' && unit.room === 'E0N1' && !unit.spawning && unit.tasks > 0));
  assert.equal(last.miningClaims,1); assert.equal(last.income,0); assert.equal(last.probe.localExpiryEnergy,0);
  const homeCapital = row => row.homeEnergy+row.units.filter(unit => unit.room === 'W0N1').reduce((sum,unit) => sum+unit.cargo,0)+row.birthCost;
  assert.equal(homeCapital(last),homeCapital(rows[0]));
  assert.deepEqual(memory.stampReloads,[21,81]);
}
module.exports = { verifyStartupAdmission };
