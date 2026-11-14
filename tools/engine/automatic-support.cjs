const assert = require('node:assert/strict');
const { supportTransportWorld } = require('./support-transport.cjs');
async function automaticSupportWorld(server, bot) {
  await supportTransportWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ type: 'creep', room: 'W0N1' });
  await db['rooms.objects'].update({ type: 'spawn', room: 'W0N1' }, { $set: { x: 45, y: 20 } });
  await db['rooms.objects'].update({ type: 'storage', room: 'W0N1' }, { $set: { store: { energy: 1000 } } });
}
function verifyAutomaticSupport(memory) {
  const rows = memory.automaticSupport;
  const last = rows.at(-1);
  console.log('AUTOMATIC_SUPPORT_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.equal(rows[0].before, 0, 'no seeded population');
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)), 'actual support spawning');
  assert.ok(rows.some(row => row.target === 50 && row.active), 'first delivery does not end recovery');
  assert.equal(last.target, 100, 'two shuttle loads reach target');
  assert.equal(last.donor, 900);
  assert.equal(last.active, false, 'target-specific exit threshold');
  assert.equal(last.units.length, 1, 'fleet demand deduplicates');
  assert.deepEqual(last.units[0].parts, ['carry', 'move']);
  assert.equal(last.units[0].owner, 'logistics:"W0N1"');
  assert.equal(last.units[0].room, 'W0N1');
  assert.equal(last.units[0].cargo, 0);
  const records = memory.eldrift.records;
  const delivered = records['logistics-requests/W0N1'].data.records.flatMap(item => item.receipts)
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  assert.equal(delivered, 100, 'confirmed delivery receipts match physical inventory');
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
  assert.deepEqual(records['spawning/W0N1'].data.requests, []);
  assert.deepEqual(records['tasks/' + last.units[0].name].data.queue, []);
}
module.exports = { automaticSupportWorld, verifyAutomaticSupport };
