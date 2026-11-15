const assert = require('node:assert/strict');
async function reloadCommittedPlan(server, bot, modules, index) {
  if (index !== 1) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.commitReloadWitness = {tick:Game.time, revision:Memory.eldrift.records["planning/W0N1"].data.revision};';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyPlanningCommit(memory) {
  assert.deepEqual(memory.commitReloadWitness, { tick: 2, revision: 1 });
  assert.deepEqual(memory.commitRows, [
    { tick: 1, calls: 1, revision: 1, preserved: true, rejection: '' },
    { tick: 2, calls: 1, revision: 1, preserved: true, rejection: 'validation' },
    { tick: 3, calls: 2, revision: 1, preserved: true, rejection: 'stale' },
  ]);
  const record = memory.eldrift.records['planning/W0N1'];
  assert.equal(record.version, 3);
  assert.equal(record.owner, 'planning');
  assert.equal(record.data.entries.filter(entry => entry.type === 'extension').length, 60);
  assert.ok(record.data.entries.some(entry => entry.objectId === 's1' && entry.tag === 'source'));
  assert.equal(record.data.provenance.committedAt, 1);
}
module.exports = { reloadCommittedPlan, verifyPlanningCommit };
