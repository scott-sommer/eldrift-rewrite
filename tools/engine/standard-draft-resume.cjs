const assert = require('node:assert/strict');
async function reloadStandardDraft(server, bot, modules, index) {
  if (index !== 5) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.draftReloadWitness = {tick:Game.time, completed:Memory.draftCheckpoint.connections.length};';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyStandardDraftResume(memory) {
  assert.deepEqual(memory.draftReloadWitness, { tick: 6, completed: 5 });
  assert.equal(memory.draftResumeRows.length, 12);
  memory.draftResumeRows.forEach((row, index) => {
    const tick = index + 1;
    assert.deepEqual(row, { tick, calls: tick <= 5 ? tick : tick - 5,
      done: tick >= 10, searches: tick <= 10 ? 1 : 0, completed: Math.min(tick, 10),
      identical: tick >= 10 ? true : null, exposedEntries: tick >= 10 });
  });
}
module.exports = { reloadStandardDraft, verifyStandardDraftResume };
