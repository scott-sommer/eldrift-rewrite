const assert = require('node:assert/strict');
const { remoteAssessmentWorld } = require('./remote-assessment.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteRuntimeWorld(server,bot) {
  await remoteAssessmentWorld(server,bot);
  await server.world.addRoomObject('E1N1','controller',20,20,{ user: null,level: 0 });
  await server.world.addRoomObject('E1N1','source',5,25,{ energy: 1500,energyCapacity: 1500,ticksToRegeneration: 300 });
  await server.world.addRoomObject('E1N1','creep',25,40,{ name: 'remote-runtime-witness',user: bot.id,body: [{ type: 'move',hits: 100 }],
    store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
}
function changeRemoteRuntime(server,bot,modules,index) { return reloadStampDraft(server,bot,modules,index,[1,7,20,40,59]); }
function verifyRemoteRuntime(memory,evidence) {
  const rows = memory.remoteRuntimeRows;
  evidence.remoteRuntime = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,100); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.some(row => row.tick < 10 && row.discovery.published.includes('E1N1')),'cardinal discovery must reach the second room');
  const leases = row => row.assignments.assignments.filter(lease => lease.home === 'W0N1' && lease.plan.room !== 'W0N2' && lease.expiresAt > row.tick);
  const phases = rows.at(-1).phases;
  assert.ok(phases.disabledAt >= 55 && phases.disabledAt < 100,'all default-budget phases must complete');
  assert.ok(rows.some(row => row.tick < phases.blockedAt && leases(row).some(lease => lease.plan.room === 'E0N1' && lease.plan.sources.length === 2)),'the registered loop must assess and select discovered sources');
  for (const row of rows.filter(row => row.tick >= 10 && row.tick < 16)) {
    assert.equal(row.management.revision,rows[8].management.revision); assert.equal(row.discovery.revision,rows[8].discovery.revision);
  }
  assert.ok(rows.filter(row => row.tick > phases.blockedAt && row.tick < phases.unblockedAt).every(row => !row.discovery.published.includes('E1N1') && leases(row).length === 0),'blocked corridor must not be bypassed by a diagonal');
  assert.ok(rows.some(row => row.tick >= phases.unblockedAt && row.tick < phases.zeroAt && leases(row).length > 0),'unblocking must resume discovery/assessment');
  assert.ok(rows.filter(row => row.tick >= phases.zeroAt && row.tick < phases.restoredAt).every(row => leases(row).length === 0));
  const disabledAt = phases.disabledAt;
  assert.ok(rows.some(row => row.tick >= phases.restoredAt && row.tick < disabledAt && leases(row).length > 0));
  const stopped = rows.find(row => row.tick === disabledAt-1);
  for (const row of rows.filter(row => row.tick >= disabledAt)) {
    assert.deepEqual(row.management,stopped.management); assert.deepEqual(row.discovery,stopped.discovery);
  }
  const manual = rows[0].assignments.assignments.find(lease => lease.plan.room === 'W0N2');
  for (const row of rows) {
    assert.deepEqual(row.sentinel,rows[0].sentinel);
    const retained = row.assignments.assignments.find(lease => lease.plan.room === 'W0N2');
    if (row.tick < 31) assert.deepEqual(retained,manual);
    else assert.ok(!retained || retained.expiresAt === 31,'automatic management must not renew the manual lease');
  }
  assert.deepEqual(memory.stampReloads,[2,8,21,41,60]);
}
module.exports = { remoteRuntimeWorld,changeRemoteRuntime,verifyRemoteRuntime };
