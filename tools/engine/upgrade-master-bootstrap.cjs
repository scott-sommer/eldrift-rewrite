const assert = require('node:assert/strict');
const { supplyFleetWorld } = require('./upgrade-supply-fleet.cjs');
async function masterBootstrapWorld(server, bot) {
  await supplyFleetWorld(server, bot, false);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'E0N1', type: 'storage' }, { $set: { x: 1, y: 22, store: { energy: 300000 } } });
  await server.world.addRoomObject('E0N1', 'spawn', 3, 22, { name: 'RetainedSpawn', user: bot.id,
    store: { energy: 0 }, storeCapacityResource: { energy: 300 }, hits: 5000, hitsMax: 5000, spawning: null });
  await server.world.addRoomObject('E0N1', 'lab', 1, 20, { user: bot.id, store: {}, storeCapacityResource: { energy: 2000 },
    hits: 500, hitsMax: 500, cooldown: 0 });
  await server.world.addRoomObject('E0N1', 'terminal', 3, 20, { user: bot.id, store: {}, storeCapacity: 300000,
    hits: 3000, hitsMax: 3000, cooldown: 0 });
}
function verifyMasterBootstrap(memory, messages) {
  assert.ok(messages.every(message => !message.includes('Error:')));
  const rows = memory.masterBootstrap, last = rows.at(-1);
  console.log('MASTER_BOOTSTRAP_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.equal(rows[0].before, 0);
  assert.equal(rows[0].sponsorEnergy - rows[1].sponsorEnergy, 950);
  assert.ok(rows.every(row => row.units.length <= 1));
  assert.equal(last.units.length, 1);
  const master = last.units[0];
  assert.equal(master.home, 'E0N1');
  assert.equal(master.owner, 'upgrade-master:E0N1');
  assert.equal(master.room, 'E0N1');
  assert.equal(master.carry, 18);
  assert.equal(master.move, 1);
  assert.deepEqual([master.x, master.y], [2, 21]);
  assert.ok(rows.slice(1).every(row => !row.storageActive && !row.terminalActive && row.level === 2));
  assert.ok(last.storage < 300000, 'retained inactive storage is usable as a source');
  assert.ok(last.received > 0, 'spawn delivery has confirmed hauling receipts');
  assert.equal(300000 - last.storage, last.received);
  assert.equal(master.cargo, 0);
}
module.exports = { masterBootstrapWorld, verifyMasterBootstrap };
