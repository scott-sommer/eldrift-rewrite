const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function upgradeBootstrapWorld(server, bot) {
  const { db } = await server.world.load();
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 20, y: 20, level: 2, progress: 0, downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1', 'storage', 18, 20, { user: bot.id, store: { energy: 1000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  await server.world.addRoomObject('W0N1', 'constructionSite', 19, 20, { user: bot.id, structureType: 'road', progress: 0, progressTotal: 300 });
}
function verifyUpgradeBootstrap(memory) {
  const rows = memory.bootstrap, last = rows.at(-1);
  console.log('BOOTSTRAP_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)), 'bootstrap worker is spawned');
  assert.ok(rows.some(row => row.units.some(unit => unit.energy > 0)), 'bootstrap worker collects energy');
  assert.equal(last.units.length, 1);
  assert.equal(last.units[0].owner, 'upgrade-bootstrap:W0N1');
  assert.equal(last.sites, 0);
  assert.equal(last.roads, 1);
  assert.ok(last.progress > 0, 'bootstrap builder upgrades after construction');
}
module.exports = { upgradeBootstrapWorld, verifyUpgradeBootstrap };
