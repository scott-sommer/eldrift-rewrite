const assert = require('node:assert/strict');
const { boostWorld } = require('./boosts.cjs');
async function boostedBuilderWorld(server,bot,mode) {
  await boostWorld(server,bot,'birth'); const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1',type: 'creep' });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 8,downgradeTime: 100000 } });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 100000 } } });
  await db['rooms.objects'].removeWhere({ room: 'W0N1',type: 'lab' });
  const resources = mode === 'lower' ? ['ZHO2','KH2O','LH2O'] : ['XZHO2','XKH2O','XLH2O'];
  for (const [index,resource] of resources.entries()) {
    const mineral = index === 0 ? 300 : mode === 'shortage' && index === 2 ? 599 : 600, energy = index === 0 ? 200 : 400;
    await server.world.addRoomObject('W0N1','lab',17+index,20,{ user: bot.id,store: { [resource]: mineral,energy },storeCapacityResource: { [resource]: 3000,energy: 2000 },storeCapacity: null,hits: 500,hitsMax: 500,cooldownTime: 0 });
  }
  for (const [index,x] of [16,17].entries()) await server.world.addRoomObject('W0N1','spawn',x,15,{ name: 'BuilderSpawn'+index,user: bot.id,store: { energy: 300 },storeCapacityResource: { energy: 300 },hits: 5000,hitsMax: 5000,spawning: null,notifyWhenAttacked: true });
  for (let index = 0; index < 52; index++) await server.world.addRoomObject('W0N1','extension',5+index%8,5+Math.floor(index/8),{ user: bot.id,store: { energy: 50 },storeCapacityResource: { energy: 50 },hits: 1000,hitsMax: 1000 });
  await server.world.addRoomObject('W0N1','constructionSite',22,21,{ structureType: 'road',user: bot.id,progress: 0,progressTotal: 1000000 });
}
function verifyBoostedBuilder(memory,mode,evidence) {
  const rows = memory.boostedBuilderRows, last = rows.at(-1), records = memory.eldrift.records, jobs = records['industry-boosts/empire']?.data.jobs ?? [];
  evidence.boostedBuilder = { mode,rows,jobs,birthResets: memory.boostBirthResets ?? [],resets: memory.boostResets ?? [] };
  assert.equal(rows.length,mode === 'normal' ? 450 : 30);
  assert.ok(rows[0].available >= 3500,'Actual spawn/extension energy must fund the body');
  if (mode !== 'normal') {
    assert.ok(rows.every(row => row.units.length === 0 && row.pending.length === 0 && row.progress === 0 && !row.complete)); assert.equal(jobs.length,0);
    assert.deepEqual(last.labs,rows[0].labs); return;
  }
  assert.ok(rows.some(row => row.pending.some(request => request.parts === 50 && request.steps === 3)));
  assert.ok(rows.every(row => row.pending.length <= 1 && row.units.length <= 1),'One whole kit cannot admit the second desired builder');
  assert.ok(rows.every(row => new Set([...row.pending.map(request => request.name),...row.units.map(unit => unit.name)]).size <= 1),'Queued and observed identities must share the same single kit');
  assert.equal(last.units.length,1); assert.equal(jobs.length,1); assert.equal(jobs[0].status,'confirmed'); assert.equal(jobs[0].acknowledged,true);
  assert.deepEqual(last.units[0].boosted,{ move: 10,carry: 20,work: 20 }); assert.equal(last.units[0].parts,50);
  assert.ok(rows.filter(row => row.units.some(unit => !unit.ready)).every(row => row.progress === 0 && !row.complete && row.units.every(unit => unit.energy === 0)),'Ordinary work/collection waits for all actual body confirmations');
  assert.ok(last.progress > 0 || last.complete,'Confirmed builder must perform ordinary construction');
  assert.ok(last.labs.every(lab => lab.amount === 0 && lab.energy === 0)); assert.equal(last.pending.length,0);
  assert.equal(evidence.boostedBuilder.birthResets.length,1); assert.equal(evidence.boostedBuilder.birthResets[0].tick,2);
  assert.ok(rows.find(row => row.tick === 2).units[0].spawning,'Reset must occur during actual150tick incubation');
  assert.equal(evidence.boostedBuilder.resets.length,3);
  for (const reset of evidence.boostedBuilder.resets) assert.equal(reset.tick,reset.attempt.tick+1);
  assert.equal(new Set(evidence.boostedBuilder.resets.map(reset => reset.attempt.resource)).size,3);
  assert.equal(jobs[0].lab,null); assert.equal(jobs[0].attempt,null);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.scope.startsWith('boost:')).length,0);
}
module.exports = { boostedBuilderWorld,verifyBoostedBuilder };
