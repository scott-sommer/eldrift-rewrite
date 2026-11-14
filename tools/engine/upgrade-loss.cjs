const assert = require('node:assert/strict');
const { upgradeMasterWorld } = require('./upgrade-master.cjs');
async function upgradeLossWorld(server, bot) {
  await upgradeMasterWorld(server, bot, false);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', name: 'local' });
  const positions = [[21,21],[20,21],[20,22],[20,23],[21,23],[22,23],[22,22]];
  for (let index = 0; index < 7; index++) await server.world.addRoomObject('W0N1', 'creep', ...positions[index], {
    user: bot.id, name: 'u' + index, body: [...Array(5).fill('move'), ...Array(42).fill('work'), ...Array(3).fill('carry')].map(type => ({ type, hits: 100 })),
    store: { energy: 150 }, storeCapacity: 150, hits: 5000, hitsMax: 5000, fatigue: 0, spawning: false, ageTime: 1000 + index * 10 });
  await server.world.addRoomObject('W0N1', 'creep', 22, 21, { user: bot.id, name: 'master',
    body: ['move', ...Array(18).fill('carry')].map(type => ({ type, hits: 100 })),
    store: {}, storeCapacity: 900, hits: 1900, hitsMax: 1900, fatigue: 0, spawning: false, ageTime: 1000 });
}
async function changeUpgradeLoss(server, bot, modules, index) {
  const { db, env } = server.common.storage;
  if (index === 3) await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { user: null, level: 0 } });
  if (index === 75) await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { user: bot.id, level: 7, progress: 0, downgradeTime: 20000 } });
  if (index !== 12) return;
  const main = modules.main + '\nMemory.upgradeLossReload = Game.time;';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyUpgradeLoss(memory) {
  const rows = memory.upgradeLoss, last = rows.at(-1);
  const lost = rows.filter(row => !row.owned);
  console.log('UPGRADE_LOSS_SUMMARY ' + JSON.stringify({ first: rows[0], lost: lost[0], parked: lost.at(-1), last }));
  assert.equal(rows.length, 160);
  assert.equal(lost.length, 72);
  assert.ok(lost.every(row => row.ownedRooms === 0), 'parking runs even with no owned rooms');
  assert.ok(memory.upgradeLossReload >= 13);
  assert.ok(lost.at(-1).units.every(unit => Math.max(Math.abs(unit.x - 20), Math.abs(unit.y - 20)) > 1), 'controller adjacent tiles are clear');
  for (const unit of lost[1].units) {
    const final = lost.at(-1).units.find(item => item.name === unit.name);
    assert.equal(final.ttl, unit.ttl - (lost.at(-1).tick - lost[1].tick), 'no renewal while unowned');
    assert.equal(final.energy, unit.energy, 'no collection or work while unowned');
  }
  assert.ok(last.owned && last.progress > 1000, 'specialists resume work after restoration');
  assert.ok(rows.every(row => row.units.length === 8), 'no specialist replacement or reassignment on ownership loss');
  assert.equal(rows[2].masterJournal.acknowledged, false);
  assert.equal(lost[0].masterJournal.attempt.id, rows[2].masterJournal.attempt.id);
  assert.deepEqual(lost[0].masterJournal.result, { status: 'observed', amount: 20 });
  assert.equal(lost[0].hydrogenDelivered, 20);
  const positions = [[21,21],[20,21],[20,22],[20,23],[21,23],[22,23],[22,22]];
  for (let index = 0; index < 7; index++) {
    const unit = last.units.find(item => item.name === 'u' + index);
    assert.deepEqual([unit.x, unit.y], positions[index], 'every ring member returns to its assigned station');
  }
  const master = last.units.find(item => item.name === 'master');
  assert.deepEqual([master.x, master.y], [22,21]);
}
module.exports = { upgradeLossWorld, changeUpgradeLoss, verifyUpgradeLoss };
