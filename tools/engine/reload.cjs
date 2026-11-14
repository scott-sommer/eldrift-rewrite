const assert = require('node:assert/strict');
async function prepareReload(server, bot, modules, index) {
  if (index === 1) {
    await bot.console('Memory.eldrift.records["operator/config"].data.empire = {backgroundEnabled:false}; "configured"');
  }
  if (index !== 2) return;
  const { db, env } = server.common.storage;
  await db['users.code'].update({ user: bot.id }, { $set: {
    modules: { ...modules, main: `${modules.main}\nMemory.__reloadWitness = {tick:Game.time, background:Memory.eldrift.records['operator/config'].data.empire.backgroundEnabled};` },
    timestamp: Date.now(),
  } });
  await env.del(`scrScriptCachedData:${bot.id}`);
  return (await db['users.code'].findOne({ user: bot.id })).modules.main;
}
function verifyReload(memory, initial) {
  assert.deepEqual(memory.__reloadWitness, { tick: initial + 2, background: false });
  assert.equal(memory.eldrift.records['operator/config'].data.empire.backgroundEnabled, false);
}
module.exports = { prepareReload, verifyReload };

