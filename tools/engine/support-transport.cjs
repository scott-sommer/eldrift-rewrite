const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function supportTransportWorld(server, bot, distant = false) {
  const { db } = await server.world.load();
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6, downgradeTime: 20000 } });
  await server.world.addRoom('E0N1');
  await server.world.setTerrain('E0N1', new TerrainMatrix());
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'controller' });
  await server.world.addRoomObject('E0N1', 'controller', 20, 20, { user: bot.id, level: 6, progress: 0, downgradeTime: 20000 });
  for (const [room, x, energy] of [['W0N1', 46, 100], ['E0N1', 2, 0]]) {
    await server.world.addRoomObject(room, 'storage', x, 20, { user: bot.id, store: { energy }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  }
  for (const [name, room, x, y] of [['support', 'W0N1', 47, 20], ['local', 'W0N1', 45, 21], ['observer', 'E0N1', 5, 23]]) {
    await server.world.addRoomObject(room, 'creep', distant && name === 'support' ? 40 : x, y, { name, user: bot.id, body: ['carry', 'move'].map(type => ({ type, hits: 100 })),
      store: { energy: 0 }, storeCapacity: 50, hits: 200, hitsMax: 200, fatigue: 0, spawning: false, ageTime: 1500 });
  }
}
async function loseSupportTarget(server, index) {
  if (index !== 3) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { user: null, level: 0 } });
}
function verifySupportTransport(memory, loss = false, reduced = false) {
  const rows = memory.supportTransport;
  const last = rows.at(-1);
  const amount = reduced ? 10 : 30;
  console.log('SUPPORT_TRANSPORT_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.ok(rows.some(row => row.cargo === amount), 'only surplus above reserve is collected');
  assert.ok(rows.every(row => row.source >= 70 && row.localCargo === 0), 'reserve and route ownership hold');
  assert.equal(last.source, loss ? 100 : 70);
  assert.equal(last.target, loss ? 0 : amount);
  assert.equal(last.cargo, 0);
  if (reduced) {
    assert.equal(rows[0].reservedStock, 30, 'initial admission reserves the then-available surplus');
    assert.ok(rows.some(row => row.source === 80 && row.cargo === 0 && row.reservedStock === 10), 'the booking shrinks before arrival and withdrawal');
  }
  assert.ok(rows.some(row => row.room === 'E0N1'), 'courier crosses into target room');
  assert.equal(last.owner, 'logistics:"W0N1"');
  assert.equal(last.room, 'W0N1');
  assert.ok(last.x > 0 && last.x < 49, 'handoff occurs inside home, avoiding border bounce');
  if (loss) assert.equal(last.room, 'W0N1');
  else assert.ok(rows.some(row => row.room === 'E0N1'), 'shared movement crosses into target room');
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  const original = records.find(record => record.request.id === 'shipment');
  assert.equal(original.receipts.reduce((sum, receipt) => sum + receipt.amount, 0), loss ? 0 : amount);
  assert.equal(original.cancelled, loss);
  const recovered = records.filter(record => record.request.id !== 'shipment').flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0);
  assert.equal(recovered, loss ? 30 : 0, 'returned cargo has its own receipts');
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
  assert.deepEqual(memory.eldrift.records['tasks/support'].data.queue, []);
}
module.exports = { supportTransportWorld, loseSupportTarget, verifySupportTransport };
async function drainSupportDonor(server, index) {
  if (index !== 2) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy: 80 } } });
}
module.exports.drainSupportDonor = drainSupportDonor;
