const assert = require('node:assert/strict');
async function reloadStampDraft(server, bot, modules, index, indices = [20, 100]) {
  if (!indices.includes(index)) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\n(Memory.stampReloads ??= []).push(Game.time);';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyStampDraft(memory) {
  assert.deepEqual(memory.stampReloads, [21, 101]);
  const entries = memory.stampEntries;
  assert.ok(entries, 'Native stamp draft must complete');
  for (const [type, count] of Object.entries({ spawn: 3, extension: 60, lab: 10, tower: 6,
    factory: 1, storage: 1, terminal: 1, powerSpawn: 1, nuker: 1, observer: 1, link: 6 })) {
    assert.equal(entries.filter(entry => entry.type === type).length, count, type);
  }
  assert.ok(memory.stampRows.some(row => !row.done));
  assert.ok(memory.stampRows.at(-1).done);
  console.log('STAMP_DRAFT_COMPLETE ' + JSON.stringify(memory.stampRows.at(-1)));
}
module.exports = { verifyStampDraft, reloadStampDraft };
