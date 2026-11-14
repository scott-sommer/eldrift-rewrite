const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function upgradeMasterWorld(server, bot, contention) {
  const { db } = await server.world.load();
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 20, y: 20, level: 7, progress: 0, downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 23, y: 22 } });
  for (let index = 0; index < 20; index++) await server.world.addRoomObject('W0N1', 'extension', 30 + index % 10, 30 + Math.floor(index / 10), {
    user: bot.id, store: { energy: 50 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000 });
  await server.world.addRoomObject('W0N1', 'storage', 21, 22, { user: bot.id, store: { H: 20, energy: 300000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  await server.world.addRoomObject('W0N1', 'terminal', 23, 20, { user: bot.id, store: { XGH2O: 1500, energy: 100 }, storeCapacity: 300000, hits: 10000, hitsMax: 10000, cooldown: 0 });
  await server.world.addRoomObject('W0N1', 'lab', 21, 20, { user: bot.id, store: { GH: 40, energy: 0 },
    storeCapacityResource: { GH: 3000, energy: 2000 }, hits: 500, hitsMax: 500, cooldown: 0 });
  if (contention) await contentionUnits(server, bot);
  await server.world.addRoomObject('W0N1', 'creep', 10, 10, { name: 'local', user: bot.id,
    body: ['carry', 'move'].map(type => ({ type, hits: 100 })), store: {}, storeCapacity: 50, hits: 200, hitsMax: 200,
    fatigue: 0, spawning: false, ageTime: 1500 });
}
async function ageUpgradeMaster(server, bot, index) {
  if (index !== 70) return;
  const { db } = await server.world.load();
  const master = (await db['rooms.objects'].find({ room: 'W0N1', type: 'creep', user: bot.id })).find(creep => creep.name !== 'local');
  assert.ok(master && !master.spawning);
  await db['rooms.objects'].update({ _id: master._id }, { $set: { ageTime: Number(await server.world.gameTime) + 490 } });
}
function verifyUpgradeMaster(memory, contention) {
  const rows = memory.upgradeMaster, last = rows.at(-1);
  console.log('UPGRADE_MASTER_SUMMARY ' + JSON.stringify({ first: rows[0], last, receipts: memory.masterReceipts.totals }));
  if (contention) {
    assert.equal(last.master.ttl, rows[0].master.ttl - 7, 'master yields renewal to the active ring');
    assert.equal(last.ring.ttl, rows[0].ring.ttl + 77, 'ring receives seven observed renewals');
    assert.ok(rows.every(row => row.master.x === 22 && row.master.y === 21 && row.total === 3));
    return;
  }
  assert.equal(rows[0].before, 0, 'master is not seeded');
  assert.ok(rows.some(row => row.master?.spawning), 'native master spawning');
  assert.ok(rows.every(row => row.total <= 2 && row.localCargo === 0), 'master service does not recruit or load ordinary couriers');
  assert.deepEqual(last.master.parts, ['move', ...Array(18).fill('carry')]);
  assert.equal(last.master.cargo, 0);
  const atStation = rows.findIndex(row => !row.master?.spawning && row.master?.x === 22 && row.master?.y === 21);
  assert.ok(atStation >= 0);
  assert.ok(rows.slice(atStation).every(row => row.master.x === 22 && row.master.y === 21), 'master never leaves the service station');
  assert.ok(rows.some((row, index) => index > 70 && row.master.ttl - rows[index - 1].master.ttl >= 30), 'native renewal raises observed TTL');
  assert.equal(last.storageH, 0);
  assert.deepEqual(last.lab, { mineral: 'XGH2O', amount: 1300 });
  assert.deepEqual(last.terminal, { H: 20, GH: 40, XGH2O: 200 });
  assert.deepEqual(memory.masterReceipts.totals, { H: 20, GH: 40, XGH2O: 1300, energy: 100 });
}
module.exports = { upgradeMasterWorld, ageUpgradeMaster, verifyUpgradeMaster };

async function contentionUnits(server, bot) {
  for (const [name, x, y, ttl, body, capacity] of [
    ['master',22,21,400,['move', ...Array(18).fill('carry')],900],
    ['ring',22,22,5,[...Array(5).fill('move'), ...Array(42).fill('work'), ...Array(3).fill('carry')],150],
  ]) await server.world.addRoomObject('W0N1', 'creep', x, y, { name, user: bot.id,
    body: body.map(type => ({ type, hits: 100 })), store: name === 'ring' ? { energy: 150 } : {}, storeCapacity: capacity,
    hits: body.length * 100, hitsMax: body.length * 100, fatigue: 0, spawning: false, ageTime: ttl });
}
