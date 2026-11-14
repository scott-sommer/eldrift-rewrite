const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function upgradeFleetWorld(server, bot, loss) {
  const { db } = await server.world.load();
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8, downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 47, y: 22 } });
  for (let index = 0; index < 50; index++) await server.world.addRoomObject('W0N1', 'extension', 30 + index % 10, 30 + Math.floor(index / 10), {
    user: bot.id, store: { energy: 100 }, storeCapacityResource: { energy: 100 }, hits: 1000, hitsMax: 1000 });
  await server.world.addRoom('E0N1');
  await server.world.setTerrain('E0N1', new TerrainMatrix());
  await db['rooms.objects'].removeWhere({ room: 'E0N1', type: 'controller' });
  await server.world.addRoomObject('E0N1', 'controller', 4, 20, { user: bot.id, level: 7, progress: 0, downgradeTime: 20000 });
  await server.world.addRoomObject('E0N1', 'storage', 5, 22, { user: bot.id, store: { energy: 300000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  await server.world.addRoomObject('E0N1', 'spawn', 7, 22, { name: 'TargetSpawn', user: bot.id, store: { energy: 300 },
    storeCapacityResource: { energy: 300 }, hits: 5000, hitsMax: 5000, spawning: null });
  await server.world.addRoomObject('E0N1', 'lab', 6, 20, { user: bot.id, store: { XGH2O: 1260, energy: 840 },
    storeCapacityResource: { XGH2O: 3000, energy: 2000 }, hits: 500, hitsMax: 500, cooldown: 0 });
  if (loss) await db['rooms.objects'].update({ room: 'W0N1', type: { $in: ['spawn', 'extension'] } }, { $set: { store: { energy: 0 } } });
  for (const [room, start, end] of [['W0N1',46,49],['E0N1',0,8]]) for (let x = start; x <= end; x++) {
    await server.world.addRoomObject(room, 'road', x, 21, { hits: 5000, hitsMax: 5000, nextDecayTime: 10000 });
  }
}
function verifyUpgradeFleet(memory, loss) {
  const rows = memory.upgradeFleet, last = rows.at(-1);
  console.log('UPGRADE_FLEET_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.equal(rows[0].before, 0, 'no seeded specialist population');
  if (loss) {
    assert.ok(rows.some(row => row.queued === 1));
    assert.equal(last.queued, 0);
    assert.ok(last.energy >= 4600, 'sponsor energy really recovered enough to afford the queued body');
    assert.ok(rows.every(row => row.units.length === 0), 'ownership loss cancels queued spawn before restored energy can fund it');
    return;
  }
  assert.equal(rows[0].energy - rows[1].energy, 4600, 'native sponsor energy pays the complete body cost');
  assert.equal(memory.upgradeFleetReload.tick, 51);
  assert.equal(memory.upgradeFleetReload.spawning, true);
  assert.equal(memory.upgradeFleetReload.home, 'E0N1');
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning && unit.room === 'W0N1')), 'native sponsoring-room spawn');
  assert.ok(rows.every(row => row.units.length <= 1), 'travel and spawning count against target');
  assert.equal(last.queued, 0);
  assert.equal(last.units.length, 1);
  assert.deepEqual({ ...last.units[0], name: undefined }, { name: undefined, room: 'E0N1', x: 6, y: 22, home: 'E0N1',
    owner: 'upgrade-room:E0N1', spawning: false, parts: 50, work: 42 });
  assert.ok(last.progress > 500, 'spawned specialist reaches its station and upgrades');
}
async function changeUpgradeFleet(server, bot, modules, index, loss) {
  const { db, env } = server.common.storage;
  if (loss) {
    if (index === 3) await db['rooms.objects'].update({ room: 'E0N1', type: 'controller' }, { $set: { user: null, level: 0 } });
    if (index === 4) {
      await db['rooms.objects'].update({ room: 'W0N1', type: 'extension' }, { $set: { store: { energy: 100 } } });
      await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { store: { energy: 300 } } });
    }
    return;
  }
  if (index !== 50) return;
  const main = modules.main + '\nMemory.upgradeFleetReload = {tick:Game.time, spawning:Object.values(Game.creeps)[0].spawning, home:Object.values(Game.creeps)[0].memory.population.home};';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
module.exports = { upgradeFleetWorld, verifyUpgradeFleet, changeUpgradeFleet };
