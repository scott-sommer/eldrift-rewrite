const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function upgradeRoomWorld(server, bot, shortage) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 20, y: 20, level: 7, progress: 0, downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 23, y: 22 } });
  for (let index = 0; index < 16; index++) await server.world.addRoomObject('W0N1', 'extension', 30 + index % 8, 30 + Math.floor(index / 8), {
    user: bot.id, store: { energy: 50 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000 });
  await server.world.addRoomObject('W0N1', 'storage', 21, 22, { user: bot.id, store: { energy: 100000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  await server.world.addRoomObject('W0N1', 'lab', 22, 20, { user: bot.id, store: { XGH2O: 1260, energy: 840 },
    storeCapacityResource: { XGH2O: 3000, energy: 2000 }, hits: 500, hitsMax: 500, cooldown: 0 });
  const positions = [[21,21],[20,21],[20,22],[20,23],[21,23],[22,23],[22,22]];
  const ttls = [1450,1200,1000,800,600,400,1380];
  for (let index = 0; index < 7; index++) await server.world.addRoomObject('W0N1', 'creep', ...positions[index], {
    user: bot.id, name: 'u' + index, body: [...Array(5).fill('move'), ...Array(42).fill('work'), ...Array(3).fill('carry')].map(type => ({ type, hits: 100 })),
    store: { energy: 150 }, storeCapacity: 150, hits: 5000, hitsMax: 5000, fatigue: 0, spawning: false, ageTime: ttls[index] });
  if (shortage) await bot.console("new RoomPosition(1,1,'W0N1').createFlag('shortage')");
}
function verifyUpgradeRoom(memory, shortage,evidence,contention = false) {
  const rows = memory.upgradeRoomEvidence;
  if (evidence) evidence.upgradeRoom = { shortage,contention,rows,reloads: memory.upgradeReload };
  const first = rows[0], last = rows.at(-1);
  console.log('UPGRADE_ROOM_SUMMARY ' + JSON.stringify({ first, last }));
  assert.equal(rows.length, 24);
  assert.ok(last.progress > first.progress + 1000, 'specialists perform sustained controller work');
  if (shortage) {
    assert.equal(last.retiring.length, 7);
    assert.equal(last.units[6].boost, 0);
    const entered = rows.find(row => row.retiring.length === 7);
    assert.ok(entered && entered.reserve === 1000000000);
    assert.equal(last.reserve, 0, 'energy policy recovers while retirement remains sticky');
    assert.equal(last.units[6].ttl, entered.units[6].ttl - (last.tick - entered.tick));
    assert.deepEqual(last.slots, first.slots);
    return;
  }
  console.log('UPGRADE_RELOAD ' + JSON.stringify(memory.upgradeReload));
  assert.equal(memory.upgradeReload.length, 2);
  assert.ok(memory.upgradeReload[0].renewing, 'reload during renewal');
  if (contention) {
    assert.equal(memory.upgradeReload[1].attempt,null,'Foreign claim prevents native admission through reset');
    assert.ok(rows.some(row => row.blocked && row.boosting.length),'Specialist waits while rotation requests boost');
    assert.ok(rows.filter(row => row.blocked).every(row => row.units[6].boost === 0));
    assert.ok(rows.some(row => row.tick >= 18 && row.units[6].boost === 42),'Owner release permits later confirmed boost');
    assert.ok(!memory.eldrift.records['quantity-reservations/empire'].data.claims.some(claim => claim.scope === 'fixture-upgrade-contention'));
  } else assert.ok(memory.upgradeReload[1].attempt, 'reload preserves an issued boost before settlement');
  assert.ok(rows.some(row => row.boosting.includes(first.slots[6].unit)), 'renewal completion schedules boost');
  assert.equal(last.units[6].boost, 42, 'native boost changes work body parts');
  assert.deepEqual(last.boosting, [], 'observed boost settles pending rotation state');
  assert.deepEqual(last.slots.map(slot => slot.slot), [1,2,3,4,5,6,0]);
  const positions = [[21,21],[20,21],[20,22],[20,23],[21,23],[22,23],[22,22]];
  for (let index = 0; index < 7; index++) assert.deepEqual([last.units[index].x, last.units[index].y], positions[(index + 1) % 7]);
  assert.ok(last.units[6].ttl > first.units[6].ttl, 'native renewal extended life');
}
async function reloadUpgradeRoom(server, bot, modules, index) {
  if (index !== 6 && index !== 14) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\n(Memory.upgradeReload ??= []).push({tick:Game.time, renewing:Memory.eldrift.records["upgrade-room/W0N1"].data.renewing, attempt:Memory.eldrift.records["upgrade-boost/W0N1"].data.attempt});';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
module.exports = { upgradeRoomWorld, verifyUpgradeRoom, reloadUpgradeRoom };
