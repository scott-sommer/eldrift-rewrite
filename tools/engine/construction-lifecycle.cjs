const assert = require('node:assert/strict');
async function changeConstructionLifecycle(server, bot, modules, index) {
  const { db, env } = server.common.storage;
  if ([2, 7, 12].includes(index)) {
    const x = index === 7 ? 24 : 23;
    await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'constructionSite', structureType: 'road', x, y: 25 });
    await server.world.addRoomObject('W0N1', 'road', x, 25, { hits: 5000, hitsMax: 5000, nextDecayTime: 10000 });
  }
  if (index === 5) await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'road', x: 23, y: 25 });
  if (index === 11 || index === 14) await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' },
    { $set: { level: index === 11 ? 5 : 6, downgradeTime: 20000 } });
  if (index === 12) await server.world.addRoomObject('W0N1', 'storage', 25, 25, {
    user: bot.id, store: { energy: 49999 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  if (index === 16 || index === 18) await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' },
    { $set: { store: { energy: index === 16 ? 50000 : 0 } } });
  if (index !== 6) return;
  const main = modules.main + '\n(Memory.constructionResets ??= []).push(Game.time);';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyConstructionLifecycle(memory) {
  const rows = memory.constructionRuntimeRows;
  assert.equal(rows.length, 20);
  assert.deepEqual(memory.constructionResets, [7]);
  assert.ok(rows.some(row => row.tick < 6 && row.roads.includes('23:25')), 'completed structure observed before loss');
  assert.ok(rows.some(row => row.tick >= 6 && !row.roads.includes('23:25')), 'structure loss observed');
  assert.ok(rows.some(row => row.tick > 8 && row.roadSites.includes('23:25')), 'lost structure receives a new construction site');
  assert.ok(rows.some(row => row.tick >= 4 && row.roadSites.includes('24:25')), 'later plan entries execute before rebuilding');
  assert.ok(rows.every(row => row.snapshot === rows[0].snapshot), 'retained plan is byte-equivalent across completion/loss/reset');
  assert.ok(rows.every(row => row.bootstrap === 'spawn:15:15' && row.planRevision === 1));
  assert.deepEqual(rows.map(row => row.revision), Array.from({ length: 20 }, (_, i) => i + 1));
  const noRampart = row => !row.sites.includes('rampart');
  const downgraded = rows.filter(row => row.level === 5);
  assert.ok(downgraded.length > 0 && downgraded.every(noRampart), 'downgrade keeps staged barrier locked');
  const underReserve = rows.filter(row => row.level === 6 && row.energy === 49999);
  assert.ok(underReserve.length > 0 && underReserve.every(noRampart), 'reserve below exact threshold prevents barrier');
  assert.ok(rows.filter(row => row.tick < 18).every(noRampart), 'barrier never appears before both gates unlock');
  assert.ok(rows.some(row => row.tick >= 18 && row.energy === 50000 && row.sites.includes('rampart')), 'RCL and exact reserve unlock barrier');
  assert.ok(rows.some(row => row.tick >= 19 && row.energy === 0 && row.sites.includes('rampart')), 'existing site survives reserve loss');
  console.log('CONSTRUCTION_LIFECYCLE '  + JSON.stringify({ reset: memory.constructionResets, last: rows.at(-1) }));
}
module.exports = { changeConstructionLifecycle, verifyConstructionLifecycle };
