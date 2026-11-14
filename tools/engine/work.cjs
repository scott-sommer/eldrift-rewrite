const assert = require('node:assert/strict');
async function workWorld(server, bot) {
  const { db } = server.common.storage;
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 20, y: 20, progress: 0 } });
  await server.world.addRoomObject('W0N1', 'road', 20, 22, { hits: 100, hitsMax: 5000, nextDecayTime: 1000 });
  await server.world.addRoomObject('W0N1', 'constructionSite', 22, 21, { structureType: 'road', user: bot.id, progress: 0, progressTotal: 300 });
  for (const [index, name] of ['build', 'repair', 'upgrade'].entries()) {
    await server.world.addRoomObject('W0N1', 'creep', 19 + index, 21, {
      name, user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
      store: { energy: 20 }, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false, fatigue: 0, ageTime: 1500,
    });
  }
}
function verifyWork(memory) {
  for (const [name, observed] of [['build', 5], ['repair', 200], ['upgrade', 1]]) {
    assert.deepEqual(memory.workEvidence[name], { outcomes: ['running', 'done', 'done'], observed });
  }
}
module.exports = { workWorld, verifyWork };
