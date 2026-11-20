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
  assert.deepEqual(memory.stampReloads,[21,81,150]);
  const observed = memory.startupFacts;
  assert.equal(observed.status,'observed');
  const facts = observed.facts;
  assert.equal(facts.observedAt,150); assert.equal(facts.home,'W0N1'); assert.equal(facts.room,'E0N1');
  assert.equal(facts.station.facts.status,'building');
  assert.equal(facts.station.facts.progress+facts.station.facts.remainingProgress,5000);
  assert.ok(facts.station.facts.progress > 0 && facts.station.facts.progress <= last.probe.construction);
  assert.equal(facts.stock.totalEnergy,9550); assert.equal(facts.stock.availableEnergy,9550);
  assert.equal(facts.endpoint.type,'storage'); assert.equal(facts.source.capacity,1500);
  assert.ok(facts.source.energy >= 0 && facts.source.energy <= facts.source.capacity);
  assert.equal(facts.workers.length,1); assert.equal(facts.workers[0].spawning,false);
  assert.equal(facts.workers[0].name,Object.entries(memory.pipelineBirths).find(([,birth]) => birth.family === 'miner')[0]);
  assert.ok(facts.authority.generation > 0 && facts.authority.expiresAt > facts.observedAt);
  assert.ok(facts.spawns.length === 1 && facts.spawns[0].remainingTime === 0);
  require('./startup-travel-check.cjs').verifyStartupTravel(memory.startupTravel);
  const proof = memory.startupProjectProof; assert.ok(proof);
  assert.equal(proof.savedAt,149); assert.equal(proof.resumedAt,150);
  assert.equal(proof.initialThrough,43); assert.equal(proof.pendingBefore,1);
  assert.equal(proof.recoveredThrough,43); assert.equal(proof.nextThrough,44);
  assert.equal(proof.frames,1); assert.equal(proof.accountedThrough,44);
  assert.ok(proof.checkpointCharacters > 0 && proof.checkpointCharacters < 1048576);
  assert.deepEqual(proof.result,proof.uninterrupted);

}
module.exports = { verifyStartupAdmission };
