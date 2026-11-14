const assert = require('node:assert/strict');
const { workWorld } = require('./work.cjs');
async function mixedWorkersWorld(server, bot) {
  await workWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 2, downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'road', x: 20 }, { $set: { hits: 3900 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'constructionSite' }, { $set: { progress: 295 } });
}
function verifyMixedWorkers(memory) {
  assert.deepEqual(memory.mixedWorkers[0], { kinds: ['build', 'build', 'upgrade'], progress: 0 });
  assert.equal(memory.mixedWorkers[1].progress, 1, 'explicit upgrader works while builders build');
  assert.deepEqual(memory.mixedWorkers[1].kinds, ['repair', 'upgrade', 'upgrade']);
  assert.ok(memory.mixedWorkers[2].progress >= 3);
}
module.exports = { mixedWorkersWorld, verifyMixedWorkers };
