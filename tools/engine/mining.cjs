const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function miningWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await server.world.addRoomObject('W0N1', 'source', 20, 20, { energy: 1000, energyCapacity: 1000, ticksToRegeneration: 300 });
  await server.world.addRoomObject('W0N1', 'container', 20, 21, {
    store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
  await server.world.addRoomObject('W0N1', 'creep', 20, 22, {
    name: 'miner', user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
    store: { energy: 48 }, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false,
    fatigue: 0, ageTime: 1500, notifyWhenAttacked: false,
  });
}
function verifyMining(memory) {
  assert.deepEqual(memory.miningEvidence.positions, [[20, 22], [20, 21], [20, 21], [20, 21], [20, 21]]);
  assert.deepEqual(memory.miningEvidence.stores, [[48, 0], [48, 0], [50, 0], [0, 50], [2, 50]]);
  assert.deepEqual(memory.miningEvidence.outcomes, Array(5).fill('running'));
}
module.exports = { miningWorld, verifyMining };

async function interruptedMiningWorld(server, bot) {
  await miningWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', name: 'miner' }, { $set: { fatigue: 6 } });
  await require('@screeps/driver').activateRoom('W0N1');
}
function verifyInterruptedMining(memory) {
  const evidence = memory.miningEvidence;
  assert.deepEqual(evidence.fatigue.slice(0, 4), [6, 4, 2, 0]);
  assert.deepEqual(evidence.positions.slice(0, 3), Array(3).fill([20, 22]));
  assert.deepEqual(evidence.positions.at(-1), [20, 21], JSON.stringify(evidence));
  assert.deepEqual(evidence.outcomes, Array(9).fill('running'));
  assert.equal(evidence.stores.at(-1)[1], 50, 'Miner must resume travel and deliver after fatigue clears');
  assert.ok(evidence.stores.at(-1)[0] > 0, 'Miner must resume production after delivery');
  assert.equal(memory.eldrift.records['tasks/miner'].data.queue.length, 1);
  assert.equal(memory.eldrift.records['tasks/miner'].data.queue[0].retries, 0);
}
module.exports.interruptedMiningWorld = interruptedMiningWorld;
module.exports.verifyInterruptedMining = verifyInterruptedMining;



