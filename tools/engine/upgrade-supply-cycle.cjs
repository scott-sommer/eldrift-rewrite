const assert = require('node:assert/strict');
const { supportTransportWorld } = require('./support-transport.cjs');
async function supplyCycleWorld(server, bot, master) {
  await supportTransportWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { level: 2 } });
  if (master) await server.world.addRoomObject('E0N1', 'creep', 2, 21, { user: bot.id, name: 'master',
    body: ['carry', 'move'].map(type => ({ type, hits: 100 })), store: {}, storeCapacity: 50,
    hits: 200, hitsMax: 200, fatigue: 0, spawning: false, ageTime: 1500 });
}
function verifySupplyCycle(memory, master) {
  const rows = memory.supplyCycle, last = rows.at(-1);
  console.log('SUPPLY_CYCLE_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.ok(rows.some(row => row.cargo === 30));
  assert.ok(rows.every(row => row.source >= 70 && row.storage === 0));
  assert.equal(last.source, 70);
  assert.equal(last.cargo, 0);
  assert.equal(last.owner, 'logistics:"W0N1"');
  assert.equal(last.room, 'W0N1');
  if (master) {
    assert.equal(last.master, 30);
    assert.equal(last.ground, 0);
    assert.equal(last.transfer.attempt.kind, 'transfer');
    assert.deepEqual(last.transfer.result, { status: 'observed', amount: 30 });
  } else {
    assert.ok(rows.some(row => row.ground > 0));
    assert.deepEqual(last.drop.result, { status: 'released', amount: 30 });
    assert.equal(last.drop.acknowledged, true);
    assert.equal(last.transfer.attempt.kind, 'withdraw');
  }
}
module.exports = { supplyCycleWorld, verifySupplyCycle };
