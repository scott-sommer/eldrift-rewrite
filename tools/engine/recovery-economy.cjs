const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function recoveryEconomyWorld(server, bot) {
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  const terrain = new TerrainMatrix();
  for (const [x, y] of [[17,14],[18,14],[19,14],[19,15],[19,16],[18,16],[17,16]]) terrain.set(x, y, 'wall');
  await server.world.setTerrain('W0N1', terrain);
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 5, downgradeTime: 20000 } });
  await server.world.addRoomObject('W0N1', 'source', 18, 15, { energy: 3000, energyCapacity: 3000 });
  await server.world.addRoomObject('W0N1', 'container', 17, 15, {
    store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
  await server.world.addRoomObject('W0N1', 'storage', 15, 16, {
    user: bot.id, store: {}, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
}
function verifyRecoveryEconomy(memory) {
  const rows = memory.recoveryEconomy;
  assert.equal(rows[0].active, true);
  assert.equal(rows[0].stored, 0);
  assert.ok(rows.some(row => row.miners === 1 && row.couriers >= 1), 'recovery creates both economic roles');
  console.log('RECOVERY_SUMMARY ' + JSON.stringify({ first: rows[0], last: rows.at(-1), minimumSpawn: Math.min(...rows.map(row => row.spawn)), maximumBank: Math.max(...rows.map(row => row.bank)), exitedAt: rows.findIndex(row => !row.active) }));
  assert.ok(rows.some(row => row.spawn < 100), 'spawning consumes the initial budget despite native passive regeneration');
  assert.ok(rows.slice(20).some(row => row.spawn >= 250), 'harvested energy replenishes spawning');
  assert.ok(rows.some(row => row.consumer >= 100), 'confirmed consumer receipts prove mined energy delivery beyond passive regeneration');
  assert.ok(rows.some(row => row.source < 2900), 'source is harvested');
  assert.ok(rows.at(-1).stored >= 50, 'surplus reaches durable storage');
  assert.equal(rows.at(-1).active, false, 'recovery exits from real stored energy');
  assert.ok(rows.some(row => row.bank >= 50), 'issued banking transfer settles even when recovery disables logistics');
  assert.deepEqual(memory.eldrift.records['spawning/W0N1'].data.requests, []);
}
module.exports = { recoveryEconomyWorld, verifyRecoveryEconomy };
