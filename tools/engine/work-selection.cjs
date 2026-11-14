const assert = require('node:assert/strict');
const { workWorld } = require('./work.cjs');
async function workSelectionWorld(server, bot) {
  await workWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'creep', name: 'repair' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'creep', name: 'upgrade' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 2, downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'road', x: 20 }, { $set: { hits: 3900 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'constructionSite' }, { $set: { progress: 295 } });
}
function verifyWorkSelection(memory) {
  assert.deepEqual(memory.workSelection, [
    { kind: 'build', target: 'road:22,21', result: 'running', sites: 1, hits: 3900, progress: 0 },
    { kind: 'repair', target: 'road:20,22', result: 'running', sites: 0, hits: 3900, progress: 0 },
    { kind: 'upgrade', target: 'controller:20,20', result: 'running', sites: 0, hits: 4000, progress: 0 },
    { kind: 'upgrade', target: 'controller:20,20', result: 'running', sites: 0, hits: 4000, progress: 1 },
  ]);
}
module.exports = { workSelectionWorld, verifyWorkSelection };
