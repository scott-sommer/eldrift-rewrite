const assert = require('node:assert/strict');
const { remoteFleetWorld } = require('./remote-fleet.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteReachabilityWorld(server,bot,mode) {
  await remoteFleetWorld(server,bot,'lifetime');
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep' });
  if (mode === 'arrival') await server.world.addRoomObject('E0N1','creep',10,40,{ name: 'reachability-sensor',user: bot.id,body: [{ type: 'tough',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 5000 });
  else for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if (!dx && !dy) continue;
    await server.world.addRoomObject('E0N1','creep',6+dx,25+dy,{ name: 'reachability-block-'+dx+'-'+dy,user: bot.id,
      body: [{ type: 'tough',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 5000 });
  }
}
async function changeRemoteReachability(server,bot,modules,index,mode) {
  await server.driver.activateRoom(['W0N1','E0N1']);
  return reloadStampDraft(server,bot,modules,index,mode === 'arrival' ? [20,60] : [20,700,1490,...(mode === 'blocked' ? [2100,2900] : [])]);
}
function verifyRemoteReachability(memory,evidence,mode) {
  const rows = memory.reachabilityRows, record = memory.eldrift.records['remoteReachability/W0N1']?.data;
  evidence.remoteReachability = { mode,rows,record,births: memory.reachabilityBirths,zeroTicks: memory.reachabilityZeroTicks ?? [],reloads: memory.stampReloads };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.deepEqual(memory.eldrift.records['fixture/reachability'],{ owner: 'fixture',version: 1,data: { preserved: true } });
  assert.ok(Object.values(memory.reachabilityBirths).every(birth => birth.bornAt < birth.readyAt),'all observed workers must be real births before readiness');
  if (mode === 'arrival') {
    assert.equal(record.sources.length,1); assert.equal(record.sources[0].lastResult,'success'); assert.equal(record.sources[0].consecutiveFailures,0); assert.deepEqual(record.blocked,[]);
    const success = rows.find(row => row.sources.length); assert.ok(success.units.some(unit => unit.kind === 'miner' && unit.room === 'E0N1' && Math.max(Math.abs(unit.x-6),Math.abs(unit.y-25)) <= 1));
    assert.ok(rows.filter(row => row.tick >= success.tick).every(row => row.sources[0].reportedAt === success.tick),'arrival must report exactly once');
    assert.deepEqual(memory.stampReloads,[21,61]);
  } else if (mode === 'withdraw') {
    assert.deepEqual(record.blocked,[]); assert.deepEqual(record.sources,[]);
    assert.ok(rows.some(row => row.attempts.some(attempt => attempt.phase === 'interrupted')));
    assert.ok(evidence.remoteReachability.zeroTicks.length > 0,'an interrupted original must still reach its natural final tick');
    assert.deepEqual(memory.stampReloads,[21,701,1491]);
  } else {
    assert.equal(record.blocked.length,1); assert.equal(record.sources[0].consecutiveFailures,2);
    const first = rows.find(row => row.sources[0]?.consecutiveFailures === 1), second = rows.find(row => row.blocked.length);
    assert.ok(first && second && second.tick > first.tick);
    for (const row of [first,second]) {
      assert.equal(row.budget,0); assert.ok(row.units.some(unit => unit.kind === 'miner' && unit.ttl === 1));
      assert.ok(row.attempts.some(attempt => attempt.phase === 'failure' && attempt.expiresAt === row.tick));
    }
    assert.ok(rows.every(row => row.units.filter(unit => unit.kind === 'miner').every(unit => unit.room !== 'E0N1' || Math.max(Math.abs(unit.x-6),Math.abs(unit.y-25)) > 1)));
    const last = rows.at(-1); assert.equal(last.tick,3100); assert.equal(last.lease,null);
    assert.ok(last.pending.every(request => request.id === 'unrelated-reachability'));
    assert.ok(last.units.every(unit => unit.room === 'W0N1' && !unit.spawning));
    assert.deepEqual(memory.stampReloads,[21,701,1491,2101,2901]);
  }
}
module.exports = { remoteReachabilityWorld,changeRemoteReachability,verifyRemoteReachability };
