const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function structureActionsWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6, downgradeTime: 20000 } });
  for (const x of [18, 19]) await server.world.addRoomObject('W0N1', 'extension', x, 15, { user: bot.id,
    store: { energy: 50 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000 });
  await server.world.addRoomObject('W0N1', 'lab', 17, 15, { user: bot.id, store: { XGH2O: 30, energy: 20 },
    storeCapacityResource: { XGH2O: 3000, energy: 2000 }, hits: 500, hitsMax: 500, cooldown: 0 });
  await server.world.addRoomObject('W0N1', 'creep', 16, 15, { user: bot.id, name: 'renewal',
    body: ['work', 'move'].map(type => ({ type, hits: 100 })), store: {}, storeCapacity: 0,
    hits: 200, hitsMax: 200, fatigue: 0, spawning: false, ageTime: 500 });
}
function verifyStructureActions(memory) {
  const rows = memory.structureActions;
  console.log('STRUCTURE_ACTIONS_SUMMARY ' + JSON.stringify(rows));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0].codes, [0, -4, -4]);
  assert.equal(rows[1].ttl - rows[0].ttl, 299);
  assert.equal(rows[1].energy, rows[0].energy - 30);
  assert.equal(rows[1].spawning, false);
  assert.deepEqual(rows[1].codes, [0, -4]);
  assert.equal(rows[2].boosted, true);
  assert.equal(rows[2].spawning, true);
  assert.equal(rows[2].energy, rows[1].energy - 50);
}
module.exports = { structureActionsWorld, verifyStructureActions };
