const assert = require('node:assert/strict');
const { colonyMineralWorld } = require('./colony-mining.cjs');
async function miningReplacementWorld(server, bot) {
  await colonyMineralWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'mineral' }, { $set: { mineralAmount: 1000 } });
  await server.world.addRoomObject('W0N1', 'creep', 17, 15, {
    name: 'incumbent', user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
    store: {}, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false,
    fatigue: 0, ageTime: 6, notifyWhenAttacked: false,
  });
}
function verifyMiningReplacement(memory) {
  const evidence = memory.replacementEvidence;
  assert.equal(evidence.sawIncumbent, true);
  assert.equal(evidence.replacements.length, 1, 'Replacement demand must not duplicate during spawning');
  assert.ok(evidence.harvested > 0, 'Replacement must acquire a station and harvest');
  assert.equal(evidence.queued, 0);
  assert.deepEqual(memory.eldrift.records['tasks/incumbent'].data.queue, []);
  const claims = memory.eldrift.records['reservations/empire'].data.claims;
  assert.ok(claims.some(claim => claim.holder === evidence.replacements[0]));
  assert.ok(claims.every(claim => claim.holder !== 'incumbent'));
}
module.exports = { miningReplacementWorld, verifyMiningReplacement };
