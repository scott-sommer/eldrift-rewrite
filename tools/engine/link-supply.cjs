const assert = require('node:assert/strict');
async function linkSupplyWorld(server, bot) {
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'source' }, { $set: { x: 10, y: 10 } });
  await server.world.addRoomObject('W0N1', 'storage', 20, 20, { user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  for (const [x, y, energy] of [[9, 10, 800], [10, 9, 800], [19, 20, 0]]) {
    await server.world.addRoomObject('W0N1', 'link', x, y, { user: bot.id, store: { energy }, storeCapacityResource: { energy: 800 }, cooldown: 0, hits: 1000, hitsMax: 1000 });
  }
}
function verifyLinkSupply(memory) {
  const journal = memory.eldrift.records['link-transfers/W0N1'].data;
  assert.equal(journal.discarded, 0);
  assert.deepEqual(journal.entries.filter(entry => entry.status === 'confirmed').map(entry => ({ ...entry.receipt, elapsed: entry.receipt.observedAt - entry.issuedAt, observedAt: undefined })), [
    { observedAt: undefined, elapsed: 1, sent: 800, receivedAfterLoss: 776 },
    { observedAt: undefined, elapsed: 1, sent: 24, receivedAfterLoss: 23 },
  ]);
  assert.ok(journal.entries.every(entry => entry.request.resource === 'energy' && entry.request.owner === 'links:W0N1'));
  assert.deepEqual(memory.linkSupply, [[800, 800, 0], [0, 800, 776], [0, 776, 799]]);
}
module.exports = { linkSupplyWorld, verifyLinkSupply };
