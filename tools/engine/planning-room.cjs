const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function planningRoomWorld(server, bot, irregular = false) {
  const { db } = await server.world.load();
  const terrain = new TerrainMatrix();
  if (irregular) for (const [x, y] of [[25, 21], [25, 29], [21, 25], [29, 25]]) terrain.set(x, y, 'wall');
  await server.world.setTerrain('W0N1', terrain);
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: { $nin: ['controller', 'spawn'] } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 40, y: 40, level: 8, downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { x: 22, y: 24 } });
  await server.world.addRoomObject('W0N1', 'storage', 25, 25, { user: bot.id, store: { energy: 100000 },
    storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  for (const x of [10, 40]) await server.world.addRoomObject('W0N1', 'source', x, 10,
    { energy: 3000, energyCapacity: 3000, ticksToRegeneration: 300 });
  await server.world.addRoomObject('W0N1', 'mineral', 10, 40, { mineralType: 'H', mineralAmount: 50000, density: 1 });
}
async function reloadPlanningRoom(server, bot, modules, index) {
  if (![50, 120, 380].includes(index)) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\n(Memory.planningRoomReloads ??= []).push(Game.time);';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyPlanningRoom(memory) {
  const rows = memory.planningRoomRows;
  console.log('PLANNING_ROOM ' + JSON.stringify({ first: rows.slice(0, 3), last: rows.slice(-5),
    firstCommit: rows.find(row => row.outcome === 'committed'), lastBest: rows.findLast(row => row.best) }));
  assert.equal(rows.length, 400);
  assert.ok(rows.every(row => row.sites === 0));
  assert.deepEqual(memory.planningRoomReloads, [51, 121, 381]);
  const records = memory.eldrift.records, plan = records['planning/W0N1'].data;
  const receipt = records['planning-jobs/W0N1'].data.receipt;
  assert.equal(receipt?.outcome, 'committed', 'native room planning must commit a complete validated plan');
  assert.equal(plan.revision, 1);
  assert.ok(rows.some(row => row.best && row.revision === 0 && row.next > 1000),
    'retain viable proposals while comparing the remaining candidate set');
  assert.equal(plan.entries.filter(entry => entry.type === 'spawn').length, 3);
  assert.equal(plan.entries.filter(entry => entry.type === 'tower').length, 6);
  for (const type of ['storage', 'terminal', 'factory', 'observer', 'nuker', 'powerSpawn', 'extractor']) {
    assert.equal(plan.entries.filter(entry => entry.type === type).length, 1, type + ' retained in complete plan');
  }
  assert.ok(plan.entries.some(entry => entry.type === 'spawn' && entry.x === 22 && entry.y === 24));
  assert.ok(plan.entries.some(entry => entry.type === 'storage' && entry.x === 25 && entry.y === 25));
  assert.equal(plan.entries.filter(entry => entry.type === 'extension').length, 60);
  assert.equal(plan.entries.filter(entry => entry.type === 'lab').length, 10);
  assert.ok(plan.entries.some(entry => entry.type === 'rampart'));
  const ids = records['planning-candidates/W0N1'].data.checkpoint.candidates;
  assert.ok(ids.some(id => id.startsWith('standard:')));
  assert.ok(ids.some(id => id.startsWith('constrained:')));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(JSON.parse(receipt.signature)[4], ids.length);
  assert.ok(rows.filter(row => row.tick > receipt.completedAt).every(row => row.revision === 1 && row.outcome === 'committed'));
  assert.ok(receipt.completedAt < 380, 'third reload verifies an already committed plan');
  console.log('PLANNING_ROOM_PLAN ' + JSON.stringify({ strategy: plan.strategy, committedAt: plan.provenance.committedAt,
    costs: plan.provenance.costs, bootstrap: plan.provenance.bootstrap,
    counts: plan.entries.reduce((counts, entry) => { counts[entry.type] = (counts[entry.type] || 0) + 1; return counts; }, {}) }));
}
module.exports = { planningRoomWorld, reloadPlanningRoom, verifyPlanningRoom };
