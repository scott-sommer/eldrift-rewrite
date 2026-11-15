const assert = require('node:assert/strict');
const { reloadStampDraft } = require('./stamp-draft.cjs');
function createStampLateReload() {
  const seen = new Set();
  return async (server, bot, modules, index) => {
    if (seen.size === 3) return;
    const memory = JSON.parse(await bot.memory);
    const row = memory.stampBudgetRows?.at(-1);
    const phase = resetPhase(row);
    if (!phase || seen.has(phase)) return;
    const marker = JSON.stringify({ phase, previous: row });
    const main = modules.main + '\n(Memory.stampLateResets ??= []).push({ ...' + marker + ', tick: Game.time });';
    const reloaded = await reloadStampDraft(server, bot, { ...modules, main }, index, [index]);
    seen.add(phase);
    return reloaded;
  };
}
function resetPhase(row) {
  if (!row) return;
  if (row.phase === 'draft' && row.depth >= 20 && row.depth < 27) return 'composition';
  if (row.phase === 'draft' && row.roads >= 20) return 'routing';
  if (row.phase === 'score' && row.service >= 10) return 'scoring';
}
function verifyStampLateReload(memory) {
  const resets = memory.stampLateResets ?? [];
  console.log('STAMP_LATE_RESETS ' + JSON.stringify(resets));
  assert.deepEqual(resets.map(item => item.phase), ['composition', 'routing', 'scoring']);
  for (const reset of resets) {
    assert.equal(reset.tick, reset.previous.tick + 1);
    assert.ok(memory.stampReloads.includes(reset.tick));
    assert.ok(memory.stampBudgetRows.some(row => row.tick > reset.tick && row.phase === reset.previous.phase));
  }
}
module.exports = { createStampLateReload, verifyStampLateReload };
