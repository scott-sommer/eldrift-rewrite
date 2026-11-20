const assert = require('node:assert/strict');
const { boostWorld } = require('./boosts.cjs');
async function workerBoostWorld(server,bot,mode) {
  await boostWorld(server,bot,'birth');
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'lab' },{ $set: { store: { XGH2O: mode === 'normal' ? 30 : 0,energy: 20 } } });
}
function verifyWorkerBoosts(memory,mode,evidence) {
  const rows = memory.workerBoostRows, last = rows.at(-1), records = memory.eldrift.records;
  const jobs = records['industry-boosts/empire']?.data.jobs ?? [];
  evidence.workerBoosts = { mode,rows,jobs,resets: memory.boostResets ?? [],birthResets: memory.boostBirthResets ?? [] };
  assert.equal(rows.length,100);
  if (mode === 'shortage') {
    assert.ok(rows.every(row => !row.units.length && row.pending === 0 && row.contracts === 0 && row.progress === 0));
    assert.equal(jobs.length,0); assert.equal(last.labEnergy,20); return;
  }
  assert.equal(last.units.length,1); assert.ok(last.progress > 0);
  if (mode === 'optional') {
    assert.ok(rows.every(row => row.contracts === 0)); assert.equal(jobs.length,0); assert.equal(last.units[0].work,0); return;
  }
  assert.ok(rows.some(row => row.contracts === 1),'Ordinary population producer must attach a boost contract');
  assert.ok(rows.every(row => row.pending <= 1 && row.units.length <= 1),'One available kit must not fund the second desired worker');
  assert.ok(rows.filter(row => row.units.some(unit => !unit.ready)).every(row => row.progress === 0));
  assert.equal(jobs.length,1); assert.equal(jobs[0].status,'confirmed'); assert.equal(jobs[0].acknowledged,true);
  assert.equal(last.units[0].work,1); assert.equal(last.labMineral,0); assert.equal(last.labEnergy,0);
  assert.equal(jobs[0].lab,null); assert.equal(jobs[0].attempt,null);
  assert.equal(evidence.workerBoosts.birthResets.length,1); assert.equal(evidence.workerBoosts.birthResets[0].tick,2);
  assert.equal(evidence.workerBoosts.resets.length,1);
  const reset = evidence.workerBoosts.resets[0]; assert.equal(reset.tick,reset.attempt.tick+1);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.scope.startsWith('boost:')).length,0);
}
module.exports = { workerBoostWorld,verifyWorkerBoosts };
