const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function upgradeBootstrapWorld(server, bot, harvest = false) {
  const { db } = await server.world.load();
  if (harvest) await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  if (harvest) await server.world.addRoomObject('W0N1', 'source', 18, 18, { energy: 3000, energyCapacity: 3000, ticksToRegeneration: 300 });
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 20, y: 20, level: 2, progress: 0, downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1', 'storage', 18, 20, { user: bot.id, store: { energy: 1000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  await server.world.addRoomObject('W0N1', 'constructionSite', 19, 20, { user: bot.id, structureType: 'road', progress: 0, progressTotal: 300 });
}
function verifyUpgradeBootstrap(memory, harvest = false) {
  const rows = memory.bootstrap, last = rows.at(-1);
  console.log('BOOTSTRAP_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)), 'bootstrap worker is spawned');
  assert.ok(rows.some(row => row.units.some(unit => unit.energy > 0)), 'bootstrap worker collects energy');
  assert.equal(last.units.length, 1);
  assert.equal(last.units[0].owner, 'upgrade-bootstrap:W0N1');
  assert.equal(last.sites, 0);
  assert.equal(last.roads, 1);
  if (harvest) assert.ok(rows.some(row => row.sourceEnergy < rows[0].sourceEnergy), 'native source energy is harvested');
  assert.ok(last.progress > 0, 'bootstrap builder upgrades after construction');
}
async function drainBootstrapStorage(server, index) {
  if (index !== 1) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy: 0 } } });
}
module.exports = { upgradeBootstrapWorld, verifyUpgradeBootstrap, drainBootstrapStorage };
