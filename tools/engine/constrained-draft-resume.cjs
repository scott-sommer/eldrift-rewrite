const assert = require('node:assert/strict');
async function reloadConstrainedDraft(server, bot, modules, index) {
  if (index !== 5 && index !== 35) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\n(Memory.draftReloadWitnesses ??= []).push({tick:Game.time, completed:Memory.draftCheckpoint.roads.traffic.lanes.length});';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyConstrainedDraftResume(memory) {
  const rows = memory.draftResumeRows;
  assert.equal(rows.length, 70);
  assert.deepEqual(memory.draftReloadWitnesses.map(row => row.tick), [6, 36]);
  assert.deepEqual(memory.draftReloadWitnesses.map(row => row.completed), [rows[4].completed, rows[34].completed]);
  assert.equal(rows.at(-1).done, true);
  assert.ok(rows.some(row => row.phase === 'traffic'));
  assert.ok(rows.some(row => row.phase === 'stitching'));
  assert.ok(rows.some(row => row.phase === 'final' && !row.done));
  const firstDone = rows.findIndex(row => row.done);
  rows.forEach((row, index) => {
    const tick = index + 1;
    assert.equal(row.calls, tick <= 5 ? tick : tick <= 35 ? tick - 5 : tick - 35);
    assert.equal(row.searches, index <= firstDone ? 1 : 0);
    assert.equal(row.done, index >= firstDone);
    assert.equal(row.exposedEntries, row.done);
    assert.equal(row.identical, row.done ? true : null);
  });
}
module.exports = { reloadConstrainedDraft, verifyConstrainedDraftResume };
