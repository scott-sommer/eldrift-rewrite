const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { supplyFleetWorld } = require('./upgrade-supply-fleet.cjs');
let ageAt;
let aged = false;
async function supplyReplacementWorld(server, bot) {
  await supplyFleetWorld(server, bot, false);
  const { db } = await server.world.load();
  const border = new TerrainMatrix();
  for (let x = 0; x < 50; x++) for (let y = 0; y < 50; y++) border.set(x, y, 'wall');
  for (const room of ['W1N1', 'W0N0', 'E0N0', 'E1N0', 'E2N1', 'W0N2', 'E0N2', 'E1N2']) await server.world.setTerrain(room, border);
  await server.world.addRoom('E1N1');
  await server.world.setTerrain('E1N1', new TerrainMatrix());
  await db['rooms.objects'].removeWhere({ room: 'E1N1' });
  await db['rooms.objects'].update({ room: 'E0N1' }, { $set: { room: 'E1N1' } });
  await db['rooms.objects'].update({ room: 'E1N1', type: 'controller' }, { $set: { level: 4, x: 44, y: 20 } });
  await db['rooms.objects'].update({ room: 'E1N1', type: 'storage' }, { $set: { x: 42, y: 20 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { x: 2, store: { energy: 4000 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 3, y: 22 } });
  for (let index = 26; index < 50; index++) await server.world.addRoomObject('W0N1', 'extension', 30 + index % 10, 30 + Math.floor(index / 10), {
    user: bot.id, store: { energy: 100 }, storeCapacityResource: { energy: 100 }, hits: 1000, hitsMax: 1000 });
  for (const room of ['W0N1', 'E0N1', 'E1N1']) for (let x = 0; x < 50; x++) {
    await server.world.addRoomObject(room, 'road', x, 21, { hits: 5000, hitsMax: 5000, nextDecayTime: 10000 });
  }
}
async function ageSupplyCourier(server, tick) {
  if (aged) return;
  const { db } = await server.world.load();
  const target = await db['rooms.objects'].findOne({ room: 'E1N1', type: 'storage' });
  if (target.store.energy >= 1650 && ageAt === undefined) ageAt = tick + 3;
  if (tick !== ageAt) return;
  const courier = await db['rooms.objects'].findOne({ type: 'creep' });
  assert.ok(courier && !courier.store.energy, 'only age the first courier after its load has been delivered');
  await db['rooms.objects'].update({ _id: courier._id }, { $set: { ageTime: Number(await server.world.gameTime) + 2 } });
  aged = true;
}
function verifySupplyReplacement(memory, messages) {
  assert.ok(messages.every(message => !message.includes('Error:')), 'no caught runtime failures are allowed');
  const rows = memory.supplyReplacement;
  const names = [...new Set(rows.flatMap(row => row.units.map(unit => unit.name)))];
  const deliveries = new Map(rows.flatMap(row => row.units.filter(unit => unit.delivery).map(unit => [unit.delivery.id,
    { name: unit.name, amount: unit.delivery.amount, tick: row.tick }])).reverse());
  const receipts = [...deliveries.values()];
  const lifecycle = names.map(name => ({ name, spawned: rows.find(row => row.units.some(unit => unit.name === name)).tick,
    mobile: rows.find(row => row.units.some(unit => unit.name === name && !unit.spawning)).tick }));
  const deliveryTicks = receipts.map(receipt => receipt.tick).sort((a, b) => a - b);
  console.log('SUPPLY_REPLACEMENT_SUMMARY ' + JSON.stringify({ route: rows[0].route, lifecycle, receipts,
    deliveryGap: deliveryTicks[1] - deliveryTicks[0], last: rows.at(-1) }));
  assert.deepEqual(rows[0].route.map(step => step.room), ['E0N1', 'E1N1']);
  assert.equal(rows[0].spawnEnergy - rows.at(-1).spawnEnergy, 5000, 'two actual 2500-energy bodies are paid for');

  assert.equal(names.length, 2);
  assert.ok(rows.every(row => row.units.length <= 1), 'fixed roster does not overlap replacement with live courier');
  assert.ok(rows.some(row => row.units.some(unit => unit.ttl <= 2 && !unit.spawning)), 'native age boundary was observed');
  for (const name of names) {
    const visited = new Set(rows.flatMap(row => row.units.filter(unit => unit.name === name).map(unit => unit.room)));
    assert.deepEqual([...visited].sort(), ['E0N1', 'E1N1', 'W0N1']);
  }
  assert.deepEqual(receipts.map(receipt => receipt.amount).sort(), [1650, 1650]);
  assert.equal(new Set(receipts.map(receipt => receipt.name)).size, 2);
  assert.equal(rows.at(-1).target, 3300);
  assert.equal(rows.at(-1).source, 700);
  assert.ok(rows.every(row => row.source >= 700));
}
module.exports = { supplyReplacementWorld, ageSupplyCourier, verifySupplyReplacement };
