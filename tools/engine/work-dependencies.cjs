const assert = require('node:assert/strict');
const { workSelectionWorld } = require('./work-selection.cjs');
async function workDependenciesWorld(server, bot) {
  await workSelectionWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'constructionSite' }, { $set: { progress: 290 } });
  await server.world.addRoomObject('W0N1', 'constructionSite', 21, 22,
    { user: bot.id, structureType: 'extension', progress: 195, progressTotal: 200 });
}
function verifyWorkDependencies(memory, messages) {
  const rows = memory.dependencies;
  console.log('DEPENDENCIES_SUMMARY ' + JSON.stringify(rows));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.deepEqual(rows.slice(0, 4).map(row => [row.road, row.extension]), [[290, 195], [295, 195], [null, 195], [null, null]]);
  assert.ok(rows.at(-1).builtRoad && rows.at(-1).builtExtension);
}
module.exports = { workDependenciesWorld, verifyWorkDependencies };
