const assert = require('node:assert/strict');
async function supplyEndpointWorld(server, bot, mode) {
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { level: 6 } });
  await server.world.addRoomObject('E0N1', 'terminal', 2, 19, { user: bot.id,
    store: mode === 'full' ? { H: 300000 } : {}, storeCapacity: 300000, hits: 3000, hitsMax: 3000, cooldown: 0 });
}
async function changeSupplyEndpoint(server, tick, mode) {
  const { db } = await server.world.load();
  if (mode === 'loss' && tick === 3) {
    await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { user: null, level: 0 } });
  }
  if (mode === 'full' && (tick === 8 || tick === 15)) {
    const terminal = await db['rooms.objects'].findOne({ room: 'E0N1', type: 'terminal' });
    await db['rooms.objects'].update({ room: 'E0N1', type: 'terminal' },
      { $set: { store: { ...terminal.store, H: tick === 8 ? 299990 : 299970 } } });
  }
}
function verifySupplyEndpoint(memory, mode) {
  const rows = memory.supplyCycle, last = rows.at(-1);
  console.log('SUPPLY_ENDPOINT_SUMMARY ' + JSON.stringify({ mode, first: rows[0], last }));
  assert.ok(rows.some(row => row.cargo === 30), 'source surplus is collected');
  assert.ok(rows.every(row => row.source >= 70 && row.storage === 0 && row.master === 0 && row.ground === 0),
    'terminal has exclusive delivery priority over available master/storage/ground');
  assert.equal(last.cargo, 0);
  assert.equal(last.owner, 'logistics:"W0N1"');
  assert.equal(last.room, 'W0N1');
  const observed = new Map(rows.filter(row => row.transfer.result?.status === 'observed' && row.transfer.attempt.kind === 'transfer')
    .map(row => [row.transfer.attempt.id, row.transfer.result.amount]));
  if (mode === 'loss') {
    assert.equal(last.source, 100, 'cargo returns to owned sponsor');
    assert.equal(last.terminal, 0);
    assert.ok(rows.every(row => row.transfer.attempt?.kind !== 'transfer' || row.transfer.attempt.room === 'W0N1'));
    assert.deepEqual([...observed.values()], [30]);
  } else {
    assert.equal(last.source, 70);
    assert.equal(last.terminal, 30);
    assert.deepEqual([...observed.values()], mode === 'full' ? [10, 20] : [30]);
  }
  if (mode === 'full') {
    assert.ok(rows.some(row => row.cargo === 30 && row.outcome.reason === 'supply-destination-full'));
    assert.ok(rows.some(row => row.cargo === 20 && row.outcome.reason === 'supply-destination-full'));
  }
}
module.exports = { supplyEndpointWorld, changeSupplyEndpoint, verifySupplyEndpoint };
