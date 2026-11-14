const assert = require('node:assert/strict');
const { build } = require('esbuild');
async function actionBundle(root) {
  const result = await build({ entryPoints: [`${root}/test/engine/action-bot.ts`], bundle: true, format: 'cjs', platform: 'neutral', target: 'es2022', write: false });
  return result.outputFiles[0].text;
}
async function actionWorld(server, bot) {
  await server.world.addRoomObject('W0N1', 'source', 20, 20, { energy: 1000, energyCapacity: 1000, ticksToRegeneration: 300 });
  await server.world.addRoomObject('W0N1', 'creep', 20, 21, {
    name: 'action-worker', user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
    store: { energy: 0 }, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false,
    fatigue: 0, ageTime: 1500, notifyWhenAttacked: false,
  });
}
function verifyActions(memory) {
  assert.deepEqual(memory.actionEvidence, { before: 0, afterIssue: 0, issued: 'issued', conflict: 'blocked', observed: 2 });
}
module.exports = { actionBundle, actionWorld, verifyActions };
