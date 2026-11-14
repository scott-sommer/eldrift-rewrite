const assert = require('node:assert/strict');
const { colonyMiningWorld } = require('./colony-mining.cjs');
async function miningSaturationWorld(server, bot) {
  await colonyMiningWorld(server);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'source' }, { $set: { energy: 3000, energyCapacity: 3000 } });
  const positions = [[17, 15], [17, 14], [17, 16], [18, 14], [18, 16]];
  for (const [index, [x, y]] of positions.entries()) {
    await server.world.addRoomObject('W0N1', 'creep', x, y, {
      name: `saturated-${index}`, user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
      store: {}, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false,
      fatigue: 0, ageTime: 1500, notifyWhenAttacked: false,
    });
  }
}
async function reloadMiningSaturation(server, bot, modules, index) {
  if (index !== 5) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\nMemory.saturationReload = Game.time;';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del(`scrScriptCachedData:${bot.id}`);
  return main;
}
function verifyMiningSaturation(memory, initial) {
  const samples = memory.saturation;
  assert.equal(samples.length, 12);
  assert.equal(memory.saturationReload, initial + 5, 'Must reconstruct application services after actual code reload');
  for (const sample of samples) {
    assert.equal(sample.workers, 5, 'Saturated source must not spawn an excess worker');
    assert.equal(sample.queued, 0, 'Excess pending demand must be cancelled');
    assert.equal(sample.tiles.length, 5);
    assert.equal(new Set(sample.tiles).size, 5, 'Each miner must retain an exclusive tile');
  }
  assert.ok(samples.at(-1).energy >= 90, 'Five miners must harvest near their combined rate');
  assert.ok(samples.at(-1).energy > samples[5].energy, 'Harvesting must continue after reload');
}
module.exports = { miningSaturationWorld, reloadMiningSaturation, verifyMiningSaturation };
