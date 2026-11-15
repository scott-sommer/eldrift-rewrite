const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { upgradeCycleWorld, reloadUpgradeCycle } = require('./upgrade-cycle.cjs');
let sitePlaced = false;
async function upgradeRebuildWorld(server, bot) {
  await upgradeCycleWorld(server, bot);
  const { db } = await server.world.load();
  await db.users.update({ _id: bot.id }, { $set: { gcl: 1000000 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 45, y: 20 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 48, y: 22 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { x: 46, y: 22 } });
  await server.world.addRoomObject('W0N1', 'terminal', 48, 20, { user: bot.id, store: {}, storeCapacity: 300000, hits: 3000, hitsMax: 3000, cooldown: 0 });
  await server.world.addRoomObject('W0N1', 'lab', 46, 20, { user: bot.id, store: {}, storeCapacityResource: { energy: 2000 }, hits: 500, hitsMax: 500, cooldown: 0 });
  await server.world.addRoom('E0N1');
  await server.world.setTerrain('E0N1', new TerrainMatrix());
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'controller' });
  await server.world.addRoomObject('E0N1', 'controller', 20, 20, { user: bot.id, level: 8, downgradeTime: 20000 });
  await server.world.addRoomObject('E0N1', 'spawn', 3, 22, { name: 'Sponsor', user: bot.id, store: { energy: 300 },
    storeCapacityResource: { energy: 300 }, hits: 5000, hitsMax: 5000, spawning: null });
  await server.world.addRoomObject('E0N1', 'storage', 2, 20, { user: bot.id, store: { energy: 100000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  for (let index = 0; index < 50; index++) await server.world.addRoomObject('E0N1', 'extension', 30 + index % 10, 30 + Math.floor(index / 10), {
    user: bot.id, store: { energy: 100 }, storeCapacityResource: { energy: 100 }, hits: 1000, hitsMax: 1000 });
}
async function changeUpgradeRebuild(server, bot, modules, tick) {
  const reloaded = await reloadUpgradeCycle(server, bot, modules, tick);
  if (!sitePlaced) {
    const { db } = await server.world.load();
    const controller = await db['rooms.objects'].findOne({ room: 'W0N1', type: 'controller' });
    if (controller.user === bot.id && controller.level === 1) {
      await server.world.addRoomObject('W0N1', 'constructionSite', 45, 21, { user: bot.id, structureType: 'road', progress: 0, progressTotal: 300 });
      sitePlaced = true;
    }
  }
  return reloaded;
}
function verifyUpgradeRebuild(memory, messages) {
  assert.ok(messages.every(message => !message.includes('Error:')), 'no caught runtime exceptions');
  const rows = memory.upgradeRebuild, last = rows.at(-1);
  const milestones = { released: rows.find(row => !row.owned && row.level === 0)?.tick,
    reclaimed: rows.find(row => row.owned && row.level === 1)?.tick,
    roadBuilt: rows.find(row => row.roads === 1)?.tick, level2: rows.find(row => row.level === 2)?.tick };
  console.log('UPGRADE_REBUILD_SUMMARY ' + JSON.stringify({ first: rows[0], last, milestones, reload: memory.cycleReload }));
  assert.ok(milestones.released < milestones.reclaimed && milestones.reclaimed < milestones.roadBuilt
    && milestones.roadBuilt < milestones.level2);
  const masters = new Set(rows.flatMap(row => row.units.filter(unit => unit.owner === 'upgrade-master:W0N1').map(unit => unit.name)));
  assert.equal(masters.size, 1, 'the same recruited master survives reset, reclaim and resumed service');
  for (const row of rows) assert.equal(new Set(row.units.map(unit => unit.owner)).size, row.units.length,
    'each configured specialist roster remains bounded to one');

  assert.equal(rows[0].level, 8);
  assert.ok(rows.some(row => !row.owned && row.level === 0));
  assert.ok(rows.some(row => row.owned && row.level === 1));
  assert.equal(memory.cycleReload.level, 0);
  assert.equal(memory.cycleReload.attempt.kind, 'unclaim');
  assert.equal(last.cycles, 1);
  assert.equal(last.owned, true);
  assert.ok(last.level >= 2 && last.progress > 0, 'real bootstrap upgrades recover RCL2 and continue');
  assert.ok(rows.some(row => row.sites === 1));
  assert.equal(last.sites, 0);
  assert.equal(last.roads, 1);
  assert.ok(last.storage < 1000);
  assert.equal(last.sponsorStock, 99970);
  assert.ok(rows.some(row => row.units.some(unit => unit.supplyDelivery === 30)));
  for (const prefix of ['upgrade-claimer:', 'upgrade-master:', 'upgrade-bootstrap:', 'upgrade-supply:']) {
    assert.ok(rows.some(row => row.units.some(unit => unit.owner.startsWith(prefix) && unit.spawning)), prefix + ' was actually spawned');
  }
}
module.exports = { upgradeRebuildWorld, changeUpgradeRebuild, verifyUpgradeRebuild };
