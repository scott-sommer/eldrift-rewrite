const assert = require('node:assert/strict');
const { remoteMiningWorld } = require('./remote-mining.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteInfrastructureWorld(server,bot) {
  await remoteMiningWorld(server,bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'container' });
  await server.world.addRoomObject('E0N1','source',6,35,{ energy: 1500,energyCapacity: 1500,ticksToRegeneration: 300 });
}
async function changeRemoteInfrastructure(server,bot,modules,index) {
  const { db } = await server.world.load();
  if (index === 5) {
    await server.world.addRoomObject('E0N1','creep',15,30,{ name: 'infrastructure-threat',user: '2',body: [{ type: 'move',hits: 100 }],
      store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
    await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'constructionSite' });
  }
  if (index === 11) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'infrastructure-threat' });
  if (index === 19 || index === 25 || index === 39) await db['rooms.objects'].removeWhere({ type: 'constructionSite' });
  return reloadStampDraft(server,bot,modules,index,[1,3,12,21,27,41]);
}
function verifyRemoteInfrastructure(memory,evidence) {
  const rows = memory.infrastructureRows;
  evidence.remoteInfrastructure = { rows,reloads: memory.stampReloads,fixtureSiteRemovalTicks: [6,20,26,40] };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]); assert.equal(rows.length,50);
  assert.equal(rows[0].draftRoutes,1); assert.deepEqual(rows[0].plans,[]);
  assert.equal(rows[1].draftRoutes,2); assert.ok(rows[1].plans.length >= 2,'the second source must complete after a global reset');
  assert.ok(rows.every(row => row.attempts <= 1),'new work is globally attempt-bounded');
  for (const room of ['W0N1','E0N1']) assert.ok(rows.some(row => row.tick < 20 && row.sites.some(site => site.room === room && site.type === 'road')),'roads must actually be accepted in '+room);
  assert.ok(rows.filter(row => row.tick >= 6 && row.tick < 12).every(row => row.attempts === 0 && row.staleAttempts === 0));
  assert.ok(rows.some(row => row.tick >= 12 && row.tick < 20 && row.attempts > 0),'safe service must resume');
  assert.ok(rows.filter(row => row.tick >= 20).every(row => row.stalePlan === 'deferred' && row.staleAttempts === 0),'old lease tokens cannot plan or construct');
  assert.ok(rows.filter(row => row.tick >= 20 && row.tick < 26).every(row => !row.active && row.attempts === 0));
  const renewed = rows.filter(row => row.tick >= 27 && row.tick < 40);
  assert.ok(renewed.some(row => row.attempts > 0));
  assert.ok(renewed.every(row => row.plans.flatMap(plan => plan.entries).every(entry => entry.type === 'container')));
  assert.ok(renewed.some(row => row.sites.filter(site => site.type === 'container').length === 2));
  assert.ok(rows.filter(row => row.tick >= 40).every(row => !row.active && row.attempts === 0 && row.sites.length === 0));
  for (const row of rows) { assert.deepEqual(row.ownedPlan,rows[0].ownedPlan); assert.deepEqual(row.ownedProgress,rows[0].ownedProgress); }
  assert.deepEqual(memory.stampReloads,[2,4,13,22,28,42]);
}
module.exports = { remoteInfrastructureWorld,changeRemoteInfrastructure,verifyRemoteInfrastructure };
