const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
let reloaded = false;
async function upgradeCycleWorld(server, bot) {
  const { db } = await server.world.load();
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 20, y: 20, level: 8, downgradeTime: 20000 } });
  for (let index = 0; index < 7; index++) await server.world.addRoomObject('W0N1', 'extension', 30 + index, 30, {
    user: bot.id, store: { energy: 50 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000 });
  await server.world.addRoomObject('W0N1', 'storage', 21, 22, { user: bot.id, store: { energy: 1000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
}
async function reloadUpgradeCycle(server, bot, modules, index) {
  if (!index || reloaded) return;
  const memory = JSON.parse(await bot.memory);
  if (memory.eldrift?.records['upgrade-lifecycle/W0N1']?.data.attempt?.kind !== 'unclaim') return;
  reloaded = true;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.cycleReload = {tick:Game.time,level:Game.rooms.W0N1.controller.level,attempt:Memory.eldrift.records["upgrade-lifecycle/W0N1"].data.attempt};';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyUpgradeCycle(memory) {
  const rows = memory.upgradeCycle, last = rows.at(-1);
  console.log('UPGRADE_CYCLE_SUMMARY ' + JSON.stringify({ first: rows[0], actions: rows.filter(row => row.duplicate !== null), last, reload: memory.cycleReload }));
  assert.ok(rows.slice(0, 5).every(row => row.level === 8 && row.units.length === 0));
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)), 'claimer was spawned, not seeded');
  const release = rows.find(row => row.attempt?.kind === 'unclaim' && row.attempt.tick === row.tick);
  assert.ok(release && release.owned);
  assert.ok(Math.max(Math.abs(release.units[0].x - 20), Math.abs(release.units[0].y - 20)) <= 1);
  assert.equal(release.duplicate, -4);
  const claim = rows.find(row => row.attempt?.kind === 'claim' && row.attempt.tick === row.tick);
  assert.ok(claim && !claim.owned && claim.released);
  assert.equal(claim.duplicate, -4);
  assert.equal(memory.cycleReload.level, 0);
  assert.equal(memory.cycleReload.attempt.kind, 'unclaim');
  assert.equal(last.level, 1);
  assert.equal(last.owned, true);
  assert.equal(last.cycles, 1);
  assert.equal(last.released, false);
  assert.equal(last.units.length, 1);
  assert.deepEqual(last.units[0].body, ['claim', 'move']);
  assert.equal(last.units[0].owner, 'upgrade-claimer:W0N1');
  assert.ok(Math.max(Math.abs(last.units[0].x - 20), Math.abs(last.units[0].y - 20)) > 1, 'completed claimer clears controller access');
  assert.ok(rows.every(row => row.units.length <= 1));
}
module.exports = { upgradeCycleWorld, reloadUpgradeCycle, verifyUpgradeCycle };
