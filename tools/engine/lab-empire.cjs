const { verifyEmpireLoss } = require('./lab-empire-loss.cjs');
const assert = require('node:assert/strict');
const { boostBulkWorld } = require('./boost-bulk.cjs');
async function labEmpireWorld(server,bot,mode) {
  await boostBulkWorld(server,bot,'normal'); const { db } = await server.world.load();
  for (const room of ['W0N1','W1N1']) await db['rooms.objects'].update({ room,type: 'storage' },{ $set: { store: { energy: 100000,H: 200,O: 200,U: 200,XGH2O: 120 } } });
  if (['loss','vision','intel'].includes(mode)) await server.world.addRoomObject('W0N1','creep',24,25,{ user: bot.id,name: 'ownership-witness',body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,fatigue: 0,spawning: false,ageTime: 1500 });
}
function verifyLabEmpire(memory,evidence,mode = 'normal') {
  if (['loss','vision','intel'].includes(mode)) return verifyEmpireLoss(memory,evidence,mode);
  const rows = memory.empireProductionRows, records = memory.eldrift.records, last = rows.at(-1);
  evidence.empireProduction = { mode,rows,reloads: memory.stampReloads,change: memory.empirePolicyChange,policyReload: evidence.empirePolicyReload,state: records['industry-empire-production/empire'] };
  if (mode === 'pause-local') return verifyLocalPause(memory,evidence);
  assert.equal(rows.length,640); assert.deepEqual(memory.stampReloads,mode === 'normal' ? [31,181,401] : [...new Set([evidence.empirePolicyReload.tick,31,181,401])].sort((a,b) => a-b));
  assert.ok(rows.every(row => row.total <= 15),'Shared target cannot be independently produced in each room');
  assert.equal(last.total,mode === 'policy' ? memory.empirePolicyChange.oldRoot : 15); assert.deepEqual(last.windows,[]);
  assert.deepEqual(rows[0].windows.map(item => [item.home,item.amount]),[['W0N1',10],['W1N1',5]]);
  for (const home of ['W0N1','W1N1']) {
    const room = last.rooms.find(item => item.home === home);
    if (mode === 'normal') assert.equal(room.bank,home === 'W0N1' ? 10 : 5); assert.equal(room.rootInLabs,0); assert.equal(room.cargo,0);
    assert.equal(room.buffer.mineral,'XGH2O'); assert.equal(room.buffer.amount,60); assert.equal(room.buffer.energy,40);
    assert.ok(rows.every(row => !row.rooms.find(item => item.home === home).reactionLabs.includes(room.buffer.id)));
    assert.deepEqual(records['tasks/'+room.courier].data.queue,[]);
    assert.ok(rows.some(row => row.windows.some(item => item.home === home && item.step?.product === 'OH')));
    assert.ok(rows.some(row => row.windows.some(item => item.home === home && item.step?.product === 'UH')));
    if (mode === 'normal') assert.ok(rows.some(row => row.windows.some(item => item.home === home && item.step?.product === 'UH2O')));
  }
  if (mode === 'pause') verifyPause(memory,evidence);
  else if (mode !== 'normal') verifyPolicyChange(memory,evidence,mode);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
}
function verifyPolicyChange(memory,evidence,mode) {
  const rows = memory.empireProductionRows, change = memory.empirePolicyChange, last = rows.at(-1);
  assert.ok(change.cargo > 0); assert.equal(evidence.empirePolicyReload.pending,true);
  const pending = rows.filter(row => row.tick >= change.tick && row.windows.some(window => window.home === 'W0N1' && window.context === change.oldWindow.context));
  assert.ok(pending.some(row => row.windows.some(window => window.home === 'W0N1' && window.retiring)));
  assert.ok(pending.every(row => row.windows.find(window => window.home === 'W0N1').rootTarget === change.oldWindow.rootTarget));
  const released = rows.find(row => row.tick > change.tick && !row.windows.some(window => window.home === 'W0N1' && window.context === change.oldWindow.context));
  assert.ok(released); const settled = released.rooms.find(room => room.home === 'W0N1');
  assert.ok(settled.receipts >= change.receipts+change.cargo,'Old admitted cargo must receive credit before old window release');
  if (mode === 'policy') {
    assert.ok(rows.filter(row => row.tick >= change.tick).every(row => row.total === change.oldRoot),'Obsolete root must stop producing');
    assert.equal(last.rooms.reduce((sum,room) => sum+room.bankUH+room.carriedUH,0),15);
    assert.ok(rows.filter(row => row.tick >= change.tick).every(row => row.rooms.reduce((sum,room) => sum+room.bankUH+room.carriedUH,0) <= 15));
  } else {
    assert.ok(rows.filter(row => row.tick >= change.tick).every(row => { const room = row.rooms.find(item => item.home === 'W0N1'); return room.bank+room.rootInLabs === change.oldHomeRoot; }));
    assert.equal(last.rooms.find(room => room.home === 'W1N1').bank,15-change.oldHomeRoot);
  }
}
module.exports = { labEmpireWorld,verifyLabEmpire };

function verifyPause(memory,evidence) {
  const rows = memory.empireProductionRows, change = memory.empirePolicyChange;
  const paused = rows.filter(row => row.paused), resumed = rows.filter(row => row.tick >= change.tick+30);
  assert.ok(change.cargo > 0); assert.equal(evidence.empirePolicyReload.pending,true);
  assert.equal(paused.length,30); assert.equal(paused[0].tick,change.tick);
  assert.ok(paused.every(row => JSON.stringify(row.products) === JSON.stringify(paused[0].products)),'No reaction products may increase under global pause');
  assert.ok(paused.every(row => row.windows.every(window => window.retiring)),'Pause may not admit new shared windows');
  const settled = paused.find(row => !row.windows.length); assert.ok(settled,'Old shared windows settle while paused');
  assert.ok(settled.rooms.find(room => room.home === 'W0N1').receipts >= change.receipts+change.cargo,'Admitted cargo receives credit before pause settlement');
  assert.ok(resumed.every(row => !row.paused)); assert.ok(resumed.some(row => row.windows.some(window => !window.retiring)),'Resume readmits shared production');
  assert.equal(rows.at(-1).total,15);
  assert.equal(memory.eldrift.records['operator/config'].data.rooms.W0N1.override.labReactionsEnabled,true);
  assert.equal(memory.eldrift.records['operator/config'].data.rooms.W1N1.override.labReactionsEnabled,true);
  assert.deepEqual(memory.eldrift.records['industry-reaction-control/empire'].data,{ paused: false });
}

function verifyLocalPause(memory,evidence) {
  const rows = memory.empireProductionRows, change = memory.localReactionPause, records = memory.eldrift.records;
  evidence.empireProduction.localPause = change;
  assert.equal(rows.length,640); assert.ok(change.cargo > 0);
  assert.equal(evidence.empirePolicyReload.pending,true);
  assert.deepEqual(memory.stampReloads,[...new Set([31,181,401,evidence.empirePolicyReload.tick])].sort((a,b) => a-b));
  const paused = rows.filter(row => row.paused); assert.equal(paused.length,30);
  assert.ok(paused.every(row => JSON.stringify(row.products) === JSON.stringify(paused[0].products)),'Local reactions must stop despite room enable overrides');
  assert.ok(rows.every(row => !row.windows.length),'Local policy must not create shared windows');
  assert.ok(paused.at(-1).rooms.find(room => room.home === 'W0N1').receipts >= change.receipts+change.cargo,'Admitted local cargo settles while paused');
  assert.equal(rows.at(-1).total,30); assert.equal(rows.at(-1).paused,false);
  for (const room of rows.at(-1).rooms) {
    assert.equal(room.bank,15); assert.equal(room.rootInLabs,0); assert.equal(room.cargo,0);
    assert.deepEqual(records['tasks/'+room.courier].data.queue,[]);
    assert.equal(records['operator/config'].data.rooms[room.home].override.labReactionsEnabled,true);
    assert.equal(records['operator/config'].data.rooms[room.home].override.labProductionScope,'room');
    assert.equal(room.buffer.amount,60); assert.equal(room.buffer.energy,40);
  }
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
}
