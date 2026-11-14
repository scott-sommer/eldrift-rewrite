const assert = require('node:assert/strict');
const { supportTransportWorld } = require('./support-transport.cjs');
async function supplyCycleWorld(server, bot, master, cargo, hold) {
  await supportTransportWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { level: 2 } });
  if (cargo) await db['rooms.objects'].update({ name: 'support', type: 'creep' }, { $set: { store: { H: 20, energy: 10 } } });
  if (hold) await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy: 100, H: 999900 } } });
  if (master) await server.world.addRoomObject('E0N1', 'creep', 2, 21, { user: bot.id, name: 'master',
    body: ['carry', 'move'].map(type => ({ type, hits: 100 })), store: {}, storeCapacity: 50,
    hits: 200, hitsMax: 200, fatigue: 0, spawning: false, ageTime: 1500 });
}
function verifySupplyCycle(memory, master, cargo, hold) {
  const rows = memory.supplyCycle, last = rows.at(-1);
  console.log('SUPPLY_CYCLE_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  if (hold) {
    assert.ok(rows.every(row => row.mineral === 20 && row.cargo === 10 && row.source === 100 && row.recovered === 999900));
    assert.ok(rows.every(row => row.outcome.reason === 'supply-cargo-destination-full'));
    assert.equal(last.transfer.attempt, null);
    assert.equal(last.drop.attempt, null);
    assert.equal(last.owner, 'upgrade-supply:["W0N1","E0N1"]');
    return;
  }
  const delivered = cargo ? 40 : 30;
  assert.ok(rows.some(row => row.cargo === 30));
  if (cargo) {
    assert.equal(rows[0].mineral, 20);
    assert.equal(last.mineral, 0);
    assert.equal(last.recovered, 20);
    assert.ok(rows.some(row => row.transfer.attempt?.resource === 'H' && row.transfer.result?.status === 'observed'
      && row.transfer.result.amount === 20 && row.transfer.acknowledged), 'foreign transfer is confirmed before the energy cycle resumes');
  }
  assert.ok(rows.every(row => row.source >= 70 && row.storage === 0));
  assert.equal(last.source, 70);
  assert.equal(last.cargo, 0);
  assert.equal(last.owner, 'logistics:"W0N1"');
  assert.equal(last.room, 'W0N1');
  if (master) {
    assert.equal(last.master, delivered);
    assert.equal(last.ground, 0);
    assert.equal(last.transfer.attempt.kind, 'transfer');
    assert.deepEqual(last.transfer.result, { status: 'observed', amount: 30 });
  } else {
    assert.ok(rows.some(row => row.ground > 0));
    const releases = new Map(rows.filter(row => row.drop.result?.status === 'released')
      .map(row => [row.drop.attempt.id, row.drop.result.amount]));
    assert.equal([...releases.values()].reduce((sum, amount) => sum + amount, 0), delivered,
      'each confirmed release is counted once, including initially carried energy');
    assert.deepEqual(last.drop.result, { status: 'released', amount: 30 });
    assert.equal(last.drop.acknowledged, true);
    assert.equal(last.transfer.attempt.kind, 'withdraw');
  }
}
module.exports = { supplyCycleWorld, verifySupplyCycle };
