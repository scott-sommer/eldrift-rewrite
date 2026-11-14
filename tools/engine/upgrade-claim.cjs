const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { upgradeCycleWorld } = require('./upgrade-cycle.cjs');
async function upgradeClaimWorld(server, bot) {
  await upgradeCycleWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 47, y: 22 } });
  await db.users.update({ _id: bot.id }, { $set: { gcl: 0 } });
  await server.world.addRoom('E0N1');
  await server.world.setTerrain('E0N1', new TerrainMatrix());
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'controller' });
  await server.world.addRoomObject('E0N1', 'controller', 4, 20, { level: 0, user: null });
  await server.world.addRoomObject('E0N1', 'creep', 4, 21, { user: bot.id, name: 'observer',
    body: [{ type: 'move', hits: 100 }], hits: 100, hitsMax: 100, fatigue: 0, store: {}, storeCapacity: 0, spawning: false, ageTime: 1500 });
}
async function releaseUpgradeGcl(server, bot, index) {
  if (index !== 5) return;
  const { db } = await server.world.load();
  await db.users.update({ _id: bot.id }, { $set: { gcl: 1000000 } });
}
function verifyUpgradeClaim(memory) {
  const rows = memory.upgradeClaim, last = rows.at(-1);
  console.log('UPGRADE_CLAIM_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.ok(rows.slice(0, 5).every(row => row.gcl === 1 && !row.owned && row.units.length === 0));
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning && unit.room === 'W0N1')));
  assert.ok(rows.some(row => row.units.some(unit => !unit.spawning && unit.room === 'E0N1')));
  assert.ok(rows.every(row => row.sponsorLevel === 8 && row.units.length <= 1));
  assert.equal(last.owned, true);
  assert.equal(last.level, 1);
  assert.equal(last.cycles, 0, 'initial acquisition is not a reset cycle');
  assert.equal(last.units.length, 1);
  assert.equal(last.units[0].home, 'E0N1');
  assert.equal(last.units[0].owner, 'upgrade-claimer:E0N1');
  assert.deepEqual(last.units[0].body, ['claim', 'move']);
  assert.ok(Math.max(Math.abs(last.units[0].x - 4), Math.abs(last.units[0].y - 20)) > 1);
}
module.exports = { upgradeClaimWorld, releaseUpgradeGcl, verifyUpgradeClaim };
