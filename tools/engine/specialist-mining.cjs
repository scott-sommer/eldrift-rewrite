const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function specialistMiningWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' },
    { $set: { user: bot.id, level: 8, downgradeTime: 100000 } });
  await server.world.addRoomObject('W0N1', 'source', 20, 20, { energy: 1000, energyCapacity: 1000 });
  await server.world.addRoomObject('W0N1', 'link', 21, 21, {
    user: bot.id, store: {}, storeCapacityResource: { energy: 800 }, hits: 1000, hitsMax: 1000, cooldown: 0,
  });
  await server.world.addRoomObject('W0N1', 'mineral', 30, 20, { mineralType: 'H', mineralAmount: 1000, density: 1 });
  await server.world.addRoomObject('W0N1', 'extractor', 30, 20, { user: bot.id, hits: 500, hitsMax: 500, cooldown: 0 });
  for (const [name, x, store] of [['link-miner', 20, { energy: 50 }], ['mineral-miner', 30, {}]]) {
    await server.world.addRoomObject('W0N1', 'creep', x, 21, {
      name, user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
      store, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false,
      fatigue: 0, ageTime: 1500, notifyWhenAttacked: false,
    });
  }
}
function verifySpecialistMining(memory) {
  const evidence = memory.specialistMining;
  assert.deepEqual(evidence.linkEnergy, [0, 50, 50]);
  assert.deepEqual(evidence.mineralAmount, [0, 1, 1]);
  assert.equal(evidence.mineralOutcomes[0], 'running');
  assert.deepEqual(evidence.mineralOutcomes.slice(1), ['extractor-cooldown', 'extractor-cooldown']);
}
module.exports = { specialistMiningWorld, verifySpecialistMining };
