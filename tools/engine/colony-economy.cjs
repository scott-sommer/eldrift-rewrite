const assert = require('node:assert/strict');
const { colonyMiningWorld } = require('./colony-mining.cjs');
async function reloadColonyEconomy(server, bot, modules, index) {
  if (index !== 50) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.economyReload = Game.time;';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyColonyEconomy(memory, initial) {
  const history = memory.colonyEconomy;
  assert.equal(history.length, 100);
  assert.equal(memory.economyReload, initial + 50);
  assert.ok(history.at(-1).delivered > history[49].delivered, 'Confirmed deliveries must continue after real code reload');
  assert.ok(history.some(sample => sample.miners >= 1 && sample.couriers >= 1), 'Mining and logistics must bootstrap together');
  assert.ok(history.some(sample => sample.delivered >= 100), 'Harvested energy must return to the spawn with confirmed receipts');
  assert.ok(history.some(sample => sample.miners >= 2), 'Returned energy must finance another miner');
}
module.exports = { colonyEconomyWorld: colonyMiningWorld, verifyColonyEconomy, reloadColonyEconomy };

