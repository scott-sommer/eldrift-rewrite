const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function boostWorld(server,bot,mode) {
  await server.world.setTerrain('W0N1',new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: mode === 'coexist' ? 7 : 6,progress: 0,x: 20,y: 23,downgradeTime: 20000 } });
  const stock = mode === 'contention' ? 120 : 60, energy = mode === 'multi' ? 60 : stock/30*20;
  await server.world.addRoomObject('W0N1','storage',20,18,{ user: bot.id,store: { energy: 100000,XGH2O: mode === 'supply' ? 60 : 0,ZO: 30 },storeCapacity: 1000000,hits: 10000,hitsMax: 10000 });
  const mineral = mode === 'supply' ? { K: 10 } : mode === 'expiry' ? {} : mode === 'alias' ? { GH2O: stock } : { XGH2O: stock };
  await server.world.addRoomObject('W0N1','lab',17,20,{ user: bot.id,store: { ...mineral,energy: ['supply','expiry'].includes(mode) ? 0 : energy },
    storeCapacityResource: { ...Object.fromEntries(Object.keys(mineral).map(resource => [resource,3000])),energy: 2000 },storeCapacity: Object.keys(mineral).length ? null : 5000,hits: 500,hitsMax: 500,cooldownTime: 0 });
  if (mode === 'coexist') for (const [x,y,resource] of [[16,21,'H'],[18,21,'O'],[17,22,null]]) {
    const store = resource ? { [resource]: 10 } : {};
    await server.world.addRoomObject('W0N1','lab',x,y,{ user: bot.id,store,storeCapacityResource: { energy: 2000,...(resource ? { [resource]: 3000 } : {}) },
      storeCapacity: resource ? null : 5000,hits: 500,hitsMax: 500,cooldownTime: 0 });
  }
  const names = mode === 'contention' ? ['boost-target','boost-target-two'] : ['boost-target'];
  for (const [index,name] of names.entries()) await server.world.addRoomObject('W0N1','creep',24,20+index,{ user: bot.id,name,
    body: ['work','work','carry','move','move'].map(type => ({ type,hits: 100 })),store: { energy: 40 },storeCapacity: 50,hits: 500,hitsMax: 500,spawning: false,fatigue: 0,ageTime: 1500 });
  await server.world.addRoomObject('W0N1','creep',20,19,{ user: bot.id,name: 'boost-courier',body: ['carry','move'].map(type => ({ type,hits: 100 })),
    store: {},storeCapacity: 50,hits: 200,hitsMax: 200,spawning: false,fatigue: 0,ageTime: 1500 });
}
function createBoostChanges() {
  const seen = new Set();
  return async (server,bot,modules,index) => {
    const memory = JSON.parse((await bot.memory) || '{}'), units = memory.boostRows?.at(-1)?.units ?? [];
    const unit = units.find(unit => unit.status === 'issued' && !seen.has(unit.name+':'+unit.attempt.resource));
    if (!unit) return;
    const key = unit.name+':'+unit.attempt.resource; seen.add(key);
    const marker = JSON.stringify({ name: unit.name,attempt: unit.attempt });
    const main = modules.main+'\n(Memory.boostResets ??= []).push({tick:Game.time,...'+marker+'});';
    return reloadStampDraft(server,bot,{ ...modules,main },index,[index]);
  };
}
function verifyBoosts(memory,mode,evidence) {
  const rows = memory.boostRows, last = rows.at(-1), records = memory.eldrift.records;
  evidence.boosts = { mode,rows,resets: memory.boostResets ?? [],queue: records['industry-boosts/empire'] };
  assert.equal(rows.length,100); assert.equal(evidence.boosts.queue.owner,'industry'); assert.equal(evidence.boosts.queue.version,1);
  for (const row of rows) for (const unit of row.units) {
    if (!unit.ready && !unit.acknowledged) assert.equal(unit.energy,40,'Ordinary worker must stay action-gated before readiness/explicit release');
    if (unit.status === 'issued') assert.equal(unit.ready,false,'Accepted API call is not body confirmation');
    if (unit.ready) { assert.equal(unit.work,2); if (mode === 'multi') assert.equal(unit.move,1); }
  }
  const failure = ['cancel','expiry','destroy'].includes(mode);
  assert.ok(last.progress > 0,'Ordinary worker resumes after confirmation or deliberate failure acknowledgement');
  if (failure) {
    const expected = { cancel: 'cancelled',expiry: 'expired',destroy: 'failed' }[mode];
    assert.equal(last.units[0].status,expected); assert.equal(last.units[0].ready,false); assert.equal(last.units[0].acknowledged,true);
    assert.ok(rows.filter(row => row.tick < 40).every(row => row.progress === 0));
  } else assert.ok(last.units.every(unit => unit.ready && unit.status === 'confirmed'));
  assert.ok(evidence.boosts.queue.data.jobs.every(job => job.lab === null && job.attempt === null));
  assert.equal(records['quantity-reservations/empire']?.data.claims.filter(claim => claim.scope.startsWith('boost:')).length ?? 0,0);
  if (mode === 'coexist') {
    assert.equal(last.bankOH,10,'Ordinary reactions continue alongside the reserved boost');
    for (const row of rows) for (const unit of row.units) if (unit.lab && ['pending','issued'].includes(unit.status)) assert.ok(!row.reactionLabs.includes(unit.lab),'Boost-reserved lab cannot belong to reaction topology');
  }
  if (mode === 'alias') {
    assert.deepEqual(evidence.boosts.queue.data.jobs[0].request.steps,[{ part: 'work',resource: 'GH2O',count: 2 }]);
    assert.equal(last.units[0].workCompound,'GH2O','Actual fallback compound must be observed on body');
    assert.ok(evidence.boosts.resets.every(reset => reset.attempt.resource === 'GH2O'));
  }
  if (mode === 'supply') assert.equal(last.bankK,10);
  if (mode === 'multi') assert.ok(rows.some(row => row.units[0].work === 2 && !row.units[0].ready));
  if (!['expiry','destroy'].includes(mode)) {
    assert.ok(evidence.boosts.resets.length >= (mode === 'multi' || mode === 'contention' ? 2 : 1));
    for (const reset of evidence.boosts.resets) assert.equal(reset.tick,reset.attempt.tick+1);
  }
}
module.exports = { boostWorld,createBoostChanges,verifyBoosts };
