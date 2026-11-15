const assert = require('node:assert/strict');
async function reloadPlanningRoutes(server, bot, modules, index) {
  if (index !== 1) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.planningReloadWitness = { tick:Game.time, routes:Memory.routeCheckpoint.routes.length, next:Memory.candidateCheckpoint.next };';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyPlanningRouteResume(memory, reloaded = false) {
  assert.deepEqual(memory.candidateOrdinals, [2, 4, 6]);
  assert.deepEqual(memory.planningRuntimeRows.map(row => row.calls), reloaded ? [1, 1, 2] : [1, 2, 3]);
  if (reloaded) assert.deepEqual(memory.planningReloadWitness, { tick: 2, routes: 1, next: 2 });
  assert.deepEqual(memory.routeBatchRows, [
    { tick: 1, done: false, searches: 1, completed: 1 },
    { tick: 2, done: true, searches: 1, completed: 2, total: 20 },
    { tick: 3, done: true, searches: 0, completed: 2, total: 20 },
  ]);
}
module.exports = { verifyPlanningRouteResume, reloadPlanningRoutes };
