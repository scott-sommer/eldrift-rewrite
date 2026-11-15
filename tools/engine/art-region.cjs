const assert = require('node:assert/strict');
const { fortifierWorkWorld } = require('./fortifier-work.cjs');
async function artRegionWorld(server, bot) {
  await fortifierWorkWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'storage', 15, 18,
    { user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
}
function verifyArtRegion(memory, messages) {
  const rows = memory.artRegion, last = rows.at(-1);
  console.log('ART_REGION_SUMMARY ' + JSON.stringify(rows));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.ok(rows.filter(row => row.tick <= 4).every(row => row.wall === 100 && row.rampart === 100));
  assert.ok(rows.some(row => row.tick < 9 && row.wall === 100 && row.rampart === 300), 'moving corner releases rampart only');
  assert.ok(rows.filter(row => row.tick >= 9 && row.tick <= 11).every(row => row.wall === 100), 'missing corner protects wall');
  assert.equal(last.wall, 300);
  assert.equal(last.rampart, 300);
  assert.equal(last.energy, 6);
  assert.equal(last.flags, 0);
  assert.equal(messages.filter(message => message.includes('barrier repairs suspended')).length, 1, 'invalid input is diagnosed without per-tick spam');
}
module.exports = { artRegionWorld, verifyArtRegion };
