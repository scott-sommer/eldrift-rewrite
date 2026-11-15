const assert = require('node:assert/strict');
async function reloadPlanningJob(server, bot, modules, index) {
  if (index !== 5 && index !== 35) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\n(Memory.jobReloadWitnesses ??= []).push({tick:Game.time,next:Memory.eldrift.records["planning-jobs/W0N1"].data.checkpoint.next});';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyPlanningJob(memory) {
  const rows = memory.jobRows;
  assert.equal(rows.length, 90);
  assert.deepEqual(memory.jobReloadWitnesses, [{ tick: 6, next: 0 }, { tick: 36, next: 1 }]);
  assert.ok(rows.some(row => row.next === 1 && row.revision === 0));
  assert.equal(rows.at(-1).committed, true);
  for (const row of rows) {
    assert.equal(row.calls, row.tick <= 5 ? row.tick : row.tick <= 35 ? row.tick - 5 : row.tick - 35);
    assert.equal(row.revision, row.committed ? 1 : 0);
    assert.equal(row.strategy, row.committed ? 'constrained' : null);
    if (row.committed) assert.equal(row.next, 2);
  }
  const job = memory.eldrift.records['planning-jobs/W0N1'];
  assert.equal(job.owner, 'planning-jobs');
  assert.equal(job.version, 1);
  assert.equal(job.data.revision, 67);
  assert.equal(memory.planningJob, undefined);
  const plan = memory.eldrift.records['planning/W0N1'].data;
  assert.equal(plan.entries.filter(entry => entry.type === 'extension').length, 60);
  assert.equal(plan.provenance.costs.hauling, 64);
  assert.equal(memory.eldrift.records['planning-jobs/W0N1'].data.checkpoint.best.strategy, 'constrained');
  console.log('PLANNING_JOB ' + JSON.stringify({ committedAt: plan.provenance.committedAt, strategy: plan.strategy }));
}
module.exports = { reloadPlanningJob, verifyPlanningJob };
