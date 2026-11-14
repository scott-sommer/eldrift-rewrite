const assert = require('node:assert/strict');
const { specialistMiningWorld } = require('./specialist-mining.cjs');
async function extractorFaultWorld(server, bot) {
  await specialistMiningWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'extractor' });
  await require('@screeps/driver').activateRoom('W0N1');
}
async function changeExtractor(server, bot, index) {
  const { db } = await server.world.load();
  if (index === 7) {
    await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 5 } });
    await server.world.addRoomObject('W0N1', 'extractor', 30, 20, { user: bot.id, hits: 500, hitsMax: 500, cooldown: 0 });
  }
  if (index === 10) await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
}
function verifyExtractorFault(memory) {
  const evidence = memory.extractorFault;
  assert.deepEqual(evidence.reasons, [...Array(7).fill('extractor-missing'), ...Array(3).fill('extractor-inactive'),
    'running', 'extractor-cooldown', 'extractor-cooldown']);
  assert.deepEqual(evidence.amounts, [...Array(11).fill(0), 1, 1]);
  assert.ok(evidence.statuses.every(status => status === 'running'), 'Long infrastructure waits must not exhaust task retries');
  const queue = memory.eldrift.records['tasks/mineral-miner'].data.queue;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].retries, 0);
}
module.exports = { extractorFaultWorld, changeExtractor, verifyExtractorFault };

