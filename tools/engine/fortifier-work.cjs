const assert = require('node:assert/strict');
const { workSelectionWorld } = require('./work-selection.cjs');
async function fortifierWorkWorld(server, bot) {
  await workSelectionWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'constructionSite' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'road' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'build' }, { $set: { store: { energy: 10 } } });
  await server.world.addRoomObject('W0N1', 'constructedWall', 18, 21, { hits: 100, hitsMax: 300000000 });
  await server.world.addRoomObject('W0N1', 'rampart', 20, 21,
    { user: bot.id, hits: 100, hitsMax: 300000, nextDecayTime: 1000 });
}
function verifyFortifierWork(memory, messages) {
  const rows = memory.fortifier, last = rows.at(-1);
  console.log('FORTIFIER_SUMMARY ' + JSON.stringify(rows));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.equal(last.wall, 300);
  assert.equal(last.rampart, 300);
  assert.ok(rows.every(row => row.wall <= 300 && row.rampart <= 300));
  assert.ok(rows.some(row => row.wall === 300 && row.rampart === 300 && row.progress === 0), 'barriers reach target before ordinary upgrade fallback');
  assert.ok(last.progress > 0);
  assert.equal(last.energy + last.progress, 6, 'four repair energy plus controller progress accounts for initial cargo');
}
module.exports = { fortifierWorkWorld, verifyFortifierWork };
