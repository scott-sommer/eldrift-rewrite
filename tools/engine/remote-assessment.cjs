const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function remoteAssessmentWorld(server,bot) {
  for (let x=-4; x<=2; x++) for (let y=-5; y<=1; y++) {
    const room = `${x<0?'W'+(-x-1):'E'+x}${y<0?'N'+(-y-1):'S'+y}`;
    if (room !== 'W0N1') await server.world.addRoom(room);
    await server.world.setTerrain(room,new TerrainMatrix());
  }
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 2,downgradeTime: 20000 } });
  for (let x=20; x<25; x++) await server.world.addRoomObject('W0N1','extension',x,20,
    { user: bot.id,store: { energy: 50 },storeCapacityResource: { energy: 50 },hits: 1000,hitsMax: 1000 });
  await server.world.addRoomObject('E0N1','controller',20,20,{ user: null,level: 0 });
  for (const x of [5,45]) await server.world.addRoomObject('E0N1','source',x,25,
    { energy: 1500,energyCapacity: 1500,ticksToRegeneration: 300 });
  await server.world.addRoomObject('E0N1','mineral',30,10,{ mineralType: 'H',mineralAmount: 10000,density: 1 });
  await server.world.addRoomObject('E0N1','road',1,25,{ hits: 100,hitsMax: 5000,nextDecayTime: 1000 });
  await server.world.addRoomObject('E0N1','rampart',2,25,{ user: '2',isPublic: false,hits: 10000,hitsMax: 10000 });
  await server.world.addRoomObject('E0N1','creep',25,40,{ name: 'remote-assessment-witness',user: bot.id,
    body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,
    spawning: false,fatigue: 0,ageTime: 1500 });
}
async function changeRemoteAssessment(server,bot,index) {
  const { db } = await server.world.load();
  if (index === 2) await server.world.addRoomObject('E0N1','creep',35,35,{ name: 'assessment-threat',user: '2',
    body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  if (index === 4) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'assessment-threat' });
  if (index === 5 || index === 6) await db['rooms.objects'].update({ room: 'E0N1',type: 'controller' },
    { $set: { reservation: { user: index === 5 ? '2' : bot.id,endTime: Number(await server.world.gameTime)+100 } } });
  if (index === 7) {
    await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'remote-assessment-witness' });
    await db['rooms.objects'].update({ room: 'E0N1',type: 'controller' },{ $set: { reservation: null } });
  }
}
function verifyRemoteAssessment(memory,evidence) {
  const rows = memory.remoteAssessmentRows;
  evidence.remoteAssessment = { rows,intel: memory.eldrift.records['intel/E0N1'] };
  assert.equal(rows.length,8); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.every(row => row.unchanged), 'assessment must not mutate observed intel or unrelated namespaces');
  for (const row of rows) assert.deepEqual(row.witness,rows[0].witness);
  for (const row of rows.filter(row => [1,2,5,7,8].includes(row.tick))) {
    assert.equal(row.near.status,'assessed'); assert.equal(row.far.status,'assessed');
    assert.ok(row.far.travel.outboundTicks > row.near.travel.outboundTicks);
    for (const quote of [row.near,row.far]) {
      assert.ok(quote.travel.minerReturnTicks > quote.travel.minerTicks,'full miner CARRY must increase the separately measured return cost');
      const timing = quote.economics.timing.miner;
      assert.equal(timing.retireTicks,quote.travel.minerReturnTicks+quote.policy.miner.replacementMargin);
      assert.equal(timing.replacementTicks,1500-timing.travelTicks-timing.retireTicks-timing.marginTicks-1);
    }
    assert.ok(row.far.economics.energy.hauling > row.near.economics.energy.hauling);
    assert.ok(row.near.economics.netRate > row.far.economics.netRate);
    assert.equal(row.near.economics.sourceRate,row.capacity/300);
    assert.equal(row.near.sourceFacts.capacity,row.capacity);
    assert.equal(row.near.policy.miner.body.filter(part => part === 'work').length,4);
    const { full,fragment,refused } = row.portfolio;
    assert.equal(full.slots,2); assert.equal(full.bundles[0].complete,true);
    assert.equal(full.bundles[0].sources.reduce((sum,item) => sum + item.economics.energy.reservation,0),1);
    assert.equal(fragment.slots,1); assert.equal(fragment.bundles[0].complete,false);
    assert.equal(fragment.bundles[0].sources[0].economics.reservationShares,1);
    assert.equal(fragment.bundles[0].sources[0].economics.energy.reservation,1);
    assert.equal(fragment.bundles[0].sources[0].source,row.near.source);
    assert.equal(refused.bundles.length,0);
    assert.ok(row.near.economics.accepted && row.far.economics.accepted);
    assert.deepEqual(row.near.travel.rooms,['W0N1','E0N1']);
  }
  assert.equal(rows[0].rejected.economics.accepted,false); assert.ok(rows[0].rejected.economics.rejected.includes('net-yield'));
  assert.equal(rows[0].unaffordable.reason,'travel:body-budget');
  assert.equal(rows[0].unaffordable.refresh,false);
  assert.equal(rows[0].paused.reason,'traversal:admission'); assert.equal(rows[0].paused.refresh,false);
  assert.equal(rows[1].partial.status,'deferred'); assert.equal(rows[1].partial.reason,'travel:path-incomplete');
  assert.ok(!('economics' in rows[1].partial), 'partial path length cannot become a source profit certificate');
  for (const row of rows.filter(row => [3,4,6].includes(row.tick))) assert.equal(row.near.reason,'traversal:hostile');
  assert.equal(rows[6].near.reservation.state,'ours'); assert.ok(rows[6].near.reservation.remainingTicks > 0);
  assert.equal(rows[7].visible,false); assert.equal(rows[7].observedAt,7);
  assert.equal(rows[7].near.observedAt,7); assert.equal(rows[7].stale.reason,'traversal:stale');
  assert.ok(!('economics' in rows[7].stale));
}
module.exports = { remoteAssessmentWorld,changeRemoteAssessment,verifyRemoteAssessment };
