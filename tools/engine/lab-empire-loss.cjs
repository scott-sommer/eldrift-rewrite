const assert = require('node:assert/strict');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function changeEmpireOwnership(server,bot,modules,index,evidence,mode) {
  const memory = JSON.parse((await bot.memory) || '{}'), trigger = memory.empireLossTrigger;
  if (!trigger) return;
  const { db } = await server.world.load();
  if (!evidence.empireLossChanged) {
    const structures = await db['rooms.objects'].find({ room: 'W0N1',user: bot.id });
    for (const object of structures.filter(item => item.type !== 'creep')) await db['rooms.objects'].update({ _id: object._id },{ $set: { user: '2' } });
    evidence.empireLossChanged = { tick: index+1,trigger };
  }
  if (!evidence.empireLossDeath && index+1 >= evidence.empireLossChanged.tick+6) {
    await db['rooms.objects'].removeWhere({ room: 'W0N1',name: 'boost-courier' });
    evidence.empireLossDeath = { tick: index+1,unit: trigger.unit };
    if (['vision','intel'].includes(mode)) {
      await db['rooms.objects'].removeWhere({ room: 'W0N1',name: 'ownership-witness' });
      evidence.empireVisionHidden = { tick: index+1 };
    }
  }
  if (evidence.empireVisionHidden && !evidence.empireVisionRestored && index+1 >= evidence.empireVisionHidden.tick+20) {
    await server.world.addRoomObject('W0N1','creep',24,25,{ user: bot.id,name: 'ownership-witness',body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,fatigue: 0,spawning: false,ageTime: 1500 });
    evidence.empireVisionRestored = { tick: index+1 };
  }
  const row = memory.empireLossRows?.at(-1);
  if (['vision','intel'].includes(mode) && evidence.empireVisionHidden && !evidence.empireVisionReload && row && !row.visible && row.window?.retiring) {
    evidence.empireVisionReload = { tick: index+1,pending: true };
    return reloadStampDraft(server,bot,modules,index,[index]);
  }
  if (!evidence.empireLossReload && row?.visible && !row.owned && row.alive && row.window?.retiring) {
    evidence.empireLossReload = { tick: index+1,pending: true };
    return reloadStampDraft(server,bot,modules,index,[index]);
  }
}
function verifyEmpireLoss(memory,evidence,mode) {
  const rows = memory.empireLossRows, production = memory.empireProductionRows, records = memory.eldrift.records;
  const transition = evidence.empireLossChanged, death = evidence.empireLossDeath, reload = evidence.empireLossReload;
  evidence.empireOwnershipLoss = { mode,rows,transition,death,reload,hidden: evidence.empireVisionHidden,restored: evidence.empireVisionRestored,visionReload: evidence.empireVisionReload,trigger: memory.empireLossTrigger,last: production.at(-1) };
  evidence.empireProduction = { rows: production,state: records['industry-empire-production/empire'] };
  assert.equal(rows.length,640); assert.ok(transition.trigger.cargo > 0); assert.equal(reload.pending,true);
  assert.deepEqual(memory.stampReloads,[...new Set([31,reload.tick,...(evidence.empireVisionReload ? [evidence.empireVisionReload.tick] : []),181,401])].sort((a,b) => a-b));
  const lost = rows.filter(row => row.tick >= transition.tick); assert.ok(lost.every(row => !row.owned)); if (mode === 'loss') assert.ok(lost.every(row => row.visible));
  const held = lost.filter(row => row.tick < death.tick); assert.ok(held.length >= 5);
  assert.ok(held.every(row => row.alive && row.window?.retiring && row.window.remaining === transition.trigger.window.remaining));
  assert.ok(held.some(row => row.cargo >= transition.trigger.cargo),'Live carried supply remains fenced');
  const baseline = JSON.stringify(lost[0].assignment); assert.ok(lost.every(row => JSON.stringify(row.assignment) === baseline),'Last-known assignment is retained');
  assert.ok(lost.every(row => row.receipts === lost[0].receipts),'Abandoned cargo cannot receive fake delivery credit');
  const released = lost.find(row => !row.window); assert.ok(released && released.tick >= death.tick); assert.equal(released.alive,false);
  assert.deepEqual(records['tasks/boost-courier'].data.queue,[]);
  assert.ok(records['logistics-retired/empire'].data.entries.some(entry => entry.unit === death.unit),'Ordinary lifecycle archives retired courier evidence');
  if (['vision','intel'].includes(mode)) verifyVisionGap(rows,production,evidence);
  if (mode === 'intel') verifyIntelRetention(rows,evidence);
  const last = production.at(-1); assert.deepEqual(last.windows,[]);
  assert.equal(last.rooms.find(room => room.home === 'W1N1').bank,15); assert.equal(last.rooms.find(room => room.home === 'W1N1').cargo,0);
  assert.ok(production.every(row => row.rooms.find(room => room.home === 'W1N1').bank+row.rooms.find(room => room.home === 'W1N1').rootInLabs <= 15));
  assert.deepEqual(records['tasks/boost-courier-second'].data.queue,[]);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
}
function verifyVisionGap(rows,production,evidence) {
  const hidden = evidence.empireVisionHidden, restored = evidence.empireVisionRestored, reload = evidence.empireVisionReload;
  assert.equal(reload.pending,true); assert.ok(reload.tick > hidden.tick && reload.tick < restored.tick);
  const blind = rows.filter(row => row.tick >= hidden.tick && row.tick < restored.tick);
  assert.ok(blind.length >= 15); assert.ok(blind.every(row => !row.visible && row.window?.retiring));
  const original = blind[0].window;
  assert.ok(blind.every(row => JSON.stringify(row.window) === JSON.stringify(original)),'Unseen window survives blind reset unchanged');
  const seen = rows.find(row => row.tick >= restored.tick && row.visible); assert.ok(seen);
  const released = rows.find(row => row.tick > hidden.tick && !row.window); assert.ok(released && released.tick >= restored.tick);
  const signature = window => JSON.stringify([window.home,window.context,window.rootTarget,window.initialStep]);
  const initial = new Set(production.find(row => row.tick === hidden.tick).windows.map(signature));
  assert.ok(production.filter(row => row.tick >= hidden.tick && row.tick < restored.tick).every(row => row.windows.every(window => initial.has(signature(window)))),'Unseen commitment freezes new admissions');
}
function verifyIntelRetention(rows,evidence) {
  const hidden = evidence.empireVisionHidden.tick, restored = evidence.empireVisionRestored.tick;
  const owned = rows.find(row => row.owned && row.intel?.data?.summary);
  assert.ok(owned); assert.equal(owned.intel.owner,'intel'); assert.equal(owned.intel.version,2); assert.equal(owned.intel.data.owned,true);
  const prior = rows.filter(row => row.tick < hidden && row.intel?.data?.summary).at(-1);
  assert.ok(prior); assert.equal(prior.intel.data.owned,false); assert.ok(prior.intel.data.sourceIds.length > 0);
  const blind = rows.filter(row => row.tick >= hidden && row.tick < restored);
  assert.ok(blind.length >= 15); assert.ok(blind.every(row => JSON.stringify(row.intel) === JSON.stringify(prior.intel)),'Last valid intel survives actual blindness and reset byte-for-byte');
  const assignment = prior.assignment.data.assignment;
  assert.ok(assignment.roster.every(id => prior.intel.data.structureIds.includes(id)),'Retained intel covers actual former lab IDs');
  const refreshed = rows.find(row => row.tick >= restored && row.intel?.data?.lastSeen > prior.intel.data.lastSeen);
  assert.ok(refreshed,'Ordinary capture refreshes only after native visibility returns');
  assert.equal(refreshed.intel.data.owned,false); assert.ok(refreshed.intel.data.summary.observedAt >= restored);
  evidence.empireIntelRetention = { firstOwned: owned.intel,lastBeforeBlind: prior.intel,firstAfterRegain: refreshed.intel,hidden,restored,blindRows: blind.length,reload: evidence.empireVisionReload };
}
module.exports = { changeEmpireOwnership,verifyEmpireLoss };
