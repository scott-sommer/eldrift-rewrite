const assert = require('node:assert/strict');
const { supportTransportWorld } = require('./support-transport.cjs');
async function supplyFleetWorld(server, bot) {
  await supportTransportWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ type: 'creep' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
  await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { level: 2 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 47, y: 22 } });
  for (let index = 0; index < 26; index++) await server.world.addRoomObject('W0N1', 'extension', 30 + index % 10, 30 + Math.floor(index / 10), {
    user: bot.id, store: { energy: 100 }, storeCapacityResource: { energy: 100 }, hits: 1000, hitsMax: 1000 });
}
function verifySupplyFleet(memory) {
  const rows = memory.supplyFleet, last = rows.at(-1);
  console.log('SUPPLY_FLEET_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.equal(rows[0].before, 0);
  assert.equal(rows[0].energy - rows[1].energy, 2500);
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)));
  assert.ok(rows.every(row => row.units.length <= 1 && row.source >= 70));
  assert.ok(rows.some(row => row.units.some(unit => unit.room === 'E0N1')));
  assert.ok(rows.some(row => row.units.some(unit => unit.drop?.result?.status === 'released' && unit.drop.result.amount === 30)));
  assert.equal(last.source, 70);
  assert.equal(last.queued, 0);
  assert.equal(last.units.length, 1);
  assert.deepEqual({ ...last.units[0], name: undefined, drop: undefined }, {
    name: undefined, drop: undefined, room: 'W0N1', home: 'W0N1', owner: 'logistics:"W0N1"',
    spawning: false, carry: 33, move: 17, energy: 0 });
}
module.exports = { supplyFleetWorld, verifySupplyFleet };
