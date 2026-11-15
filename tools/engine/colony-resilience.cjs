const assert = require('node:assert/strict');
const { recoveryEconomyWorld } = require('./recovery-economy.cjs');
const losses = [];
async function colonyResilienceWorld(server, bot) {
  await recoveryEconomyWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 13, y: 18, progress: 0 } });
  await server.world.addRoomObject('W0N1', 'constructionSite', 14, 16, { user: bot.id, structureType: 'road', progress: 0, progressTotal: 300 });
}
async function disruptColony(server, bot, tick) {
  if (tick < 150 || tick % 10 || losses.length >= 3) return;
  const memory = JSON.parse(await bot.memory);
  const row = memory.colonyResilience?.at(-1);
  if (!row || row.active || row.stored < 100 || row.progress <= 0 || row.sites > 0) return;
  const live = row.units.filter(unit => !unit.spawning);
  if (!['miner', 'hauler', 'worker'].every(role => live.some(unit => unit.role === role))) return;
  if (losses.some(loss => live.some(unit => unit.name === loss.name))) return;
  const role = ['miner', 'hauler', 'worker'][losses.length];
  const unit = live.find(unit => unit.role === role);
  losses.push({ role, name: unit.name, tick: row.tick, delivered: row.delivered, progress: row.progress });
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ type: 'creep', name: unit.name });
  if (role === 'worker') {
    await db['rooms.objects'].update({ room: 'W0N1', type: { $in: ['spawn', 'extension', 'storage', 'container'] } }, { $set: { store: { energy: 0 } } });
    await server.world.addRoomObject('W0N1', 'constructionSite', 14, 17, { user: bot.id, structureType: 'road', progress: 0, progressTotal: 300 });
  }
}
function verifyColonyResilience(memory, messages) {
  const rows = memory.colonyResilience, last = rows.at(-1);
  console.log('COLONY_RESILIENCE_SUMMARY ' + JSON.stringify({ first: rows[0], losses, last }));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.equal(rows[0].units.length, 1, 'only the newly spawning economic unit exists initially');
  assert.deepEqual(losses.map(loss => loss.role), ['miner', 'hauler', 'worker']);
  for (const loss of losses) {
    const later = rows.filter(row => row.tick > loss.tick);
    assert.ok(later.some(row => row.units.some(unit => unit.role === loss.role && unit.name !== loss.name && !unit.spawning)), 'replacement for ' + loss.role);
    assert.ok(last.delivered > loss.delivered && last.progress > loss.progress);
  }
  const finalLoss = losses[2];
  assert.ok(last.progress >= finalLoss.progress + 10, 'upgrading advances beyond the first recovered action');
  assert.ok(rows.some(row => row.tick > finalLoss.tick && row.active && row.stored === 0), 'energy loss re-enters recovery');
  assert.equal(last.active, false);
  assert.ok(last.stored >= 100);
  assert.equal(last.sites, 0);
  assert.equal(last.roads, 2);
  assert.ok(last.delivered >= 500, 'confirmed logistics deliveries establish substantial throughput');
  assert.ok(last.source < 3000);
}
module.exports = { colonyResilienceWorld, disruptColony, verifyColonyResilience };
