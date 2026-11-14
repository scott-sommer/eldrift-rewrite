const assert = require('node:assert/strict');
async function reloadMineralTransport(server, bot, modules, index) {
  if (index !== 2) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.mineralReload = Game.time;';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyMineralReload(memory, initial) {
  assert.equal(memory.mineralReload, initial + 2);
  assert.equal(memory.mineralTransport[2][1], 20, 'Reload occurs while courier carries terminal-bound minerals');
}
module.exports = { reloadMineralTransport, verifyMineralReload };
