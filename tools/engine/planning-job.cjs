const assert = require('node:assert/strict');
async function reloadPlanningJob(server, bot, modules, index) {
  if (![5, 39, 90, 159, 199].includes(index)) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\n(Memory.jobReloadWitnesses ??= []).push({tick:Game.time,next:Memory.eldrift.records["planning-jobs/W0N1"].data.checkpoint.next});';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyPlanningJob(memory) {
  const rows = memory.jobRows;
  assert.equal(rows.length, 230);
  assert.deepEqual(memory.jobReloadWitnesses, [{ tick: 6, next: 0 }, { tick: 40, next: 0 }, { tick: 91, next: 1 }, { tick: 160, next: 1 }, { tick: 200, next: 2 }]);
  assert.ok(rows.some(row => row.next === 1 && row.revision === 0));
  assert.equal(rows.at(-1).committed, true);
  for (const row of rows) {
    const reset = [0, 5, 39, 90, 159, 199].filter(index => index < row.tick).at(-1);
    assert.equal(row.calls, row.tick - reset);
    assert.equal(row.revision, row.tick >= 199 ? 1 : 0);
    assert.equal(row.strategy, row.tick >= 199 ? 'constrained' : null);
    if (row.committed) assert.equal(row.next, 2);
  }
  const job = memory.eldrift.records['planning-jobs/W0N1'];
  assert.equal(job.owner, 'planning-jobs');
  assert.equal(job.version, 1);
  assert.equal(job.data.revision, 200);
  assert.equal(memory.recoveredCommit, true);
  assert.equal(rows[198].committed, false);
  assert.equal(rows[199].committed, true);
  assert.equal(memory.planningJob, undefined);
  const plan = memory.eldrift.records['planning/W0N1'].data;
  assert.equal(plan.entries.filter(entry => entry.type === 'extension').length, 60);
  assert.deepEqual(plan.provenance.costs, { hauling: 64, service: 337, capacityShortfall: 0, swamps: 0, defense: 85, migration: 303 });
  assert.equal(plan.provenance.committedAt, 199);
  assert.equal(memory.eldrift.records['planning-jobs/W0N1'].data.checkpoint.best.strategy, 'constrained');
  console.log('PLANNING_JOB ' + JSON.stringify({ committedAt: plan.provenance.committedAt, strategy: plan.strategy }));
}
module.exports = { reloadPlanningJob, verifyPlanningJob };
