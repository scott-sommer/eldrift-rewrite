const assert = require('node:assert/strict');
const { upgradeBootstrapWorld } = require('./upgrade-bootstrap.cjs');
async function bootstrapSalvageWorld(server, bot, mode) {
  await upgradeBootstrapWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  if (mode === 'depleted') await server.world.addRoomObject('W0N1', 'source', 18, 18,
    { energy: 0, energyCapacity: 3000, nextRegenerationTime: 1000 });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy: 0 } } });
  await server.world.addRoomObject('W0N1', 'constructedWall', 19, 19, { hits: 1000, hitsMax: 300000000 });
  const body = [...Array(6).fill('work'), 'carry', ...Array(6).fill('move')].map(type => ({ type, hits: 100 }));
  await server.world.addRoomObject('W0N1', 'creep', 20, 19, {
    name: mode, user: bot.id, body, store: { energy: 0 }, storeCapacity: 50,
    hits: 1300, hitsMax: 1300, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyBootstrapSalvage(memory, mode, messages) {
  const rows = memory.salvage, last = rows.at(-1);
  console.log('SALVAGE_SUMMARY ' + JSON.stringify({ mode, rows }));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.equal(rows[0].wall, 1000);
  assert.equal(rows[0].energy, 0);
  if (mode === 'enabled') {
    assert.equal(last.wall, 0);
    assert.ok(rows.some(row => row.energy > 0), 'native dismantling produces usable energy');
    assert.ok(last.siteProgress > 0, 'salvaged energy advances construction');
  } else {
    assert.ok(rows.every(row => row.wall === 1000 && row.energy === 0 && row.siteProgress === 0));
    if (mode === 'depleted') assert.ok(rows.every(row => row.sources === 1 && row.sourceEnergy === 0));
  }
}
module.exports = { bootstrapSalvageWorld, verifyBootstrapSalvage };
