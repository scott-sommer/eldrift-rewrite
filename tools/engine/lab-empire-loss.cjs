const assert = require('node:assert/strict');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function changeEmpireOwnership(server,bot,modules,index,evidence) {
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
  }
  const row = memory.empireLossRows?.at(-1);
  if (!evidence.empireLossReload && row?.visible && !row.owned && row.alive && row.window?.retiring) {
    evidence.empireLossReload = { tick: index+1,pending: true };
    return reloadStampDraft(server,bot,modules,index,[index]);
  }
}
function verifyEmpireLoss(memory,evidence) {
  const rows = memory.empireLossRows, production = memory.empireProductionRows, records = memory.eldrift.records;
  const transition = evidence.empireLossChanged, death = evidence.empireLossDeath, reload = evidence.empireLossReload;
  evidence.empireOwnershipLoss = { rows,productionRows: undefined,transition,death,reload,trigger: memory.empireLossTrigger,last: production.at(-1) };
  evidence.empireProduction = { rows: production,state: records['industry-empire-production/empire'] };
  assert.equal(rows.length,640); assert.ok(transition.trigger.cargo > 0); assert.equal(reload.pending,true);
  assert.deepEqual(memory.stampReloads,[...new Set([31,reload.tick,181,401])].sort((a,b) => a-b));
  const lost = rows.filter(row => row.tick >= transition.tick); assert.ok(lost.every(row => row.visible && !row.owned));
  const held = lost.filter(row => row.tick < death.tick); assert.ok(held.length >= 5);
  assert.ok(held.every(row => row.alive && row.window?.retiring && row.window.remaining === transition.trigger.window.remaining));
  assert.ok(held.some(row => row.cargo >= transition.trigger.cargo),'Live carried supply remains fenced');
  const baseline = JSON.stringify(lost[0].assignment); assert.ok(lost.every(row => JSON.stringify(row.assignment) === baseline),'Last-known assignment is retained');
  assert.ok(lost.every(row => row.receipts === lost[0].receipts),'Abandoned cargo cannot receive fake delivery credit');
  const released = lost.find(row => !row.window); assert.ok(released && released.tick >= death.tick); assert.equal(released.alive,false);
  assert.deepEqual(records['tasks/boost-courier'].data.queue,[]);
  assert.ok(records['logistics-retired/empire'].data.entries.some(entry => entry.unit === death.unit),'Ordinary lifecycle archives retired courier evidence');
  const last = production.at(-1); assert.deepEqual(last.windows,[]);
  assert.equal(last.rooms.find(room => room.home === 'W1N1').bank,15); assert.equal(last.rooms.find(room => room.home === 'W1N1').cargo,0);
  assert.ok(production.every(row => row.rooms.find(room => room.home === 'W1N1').bank+row.rooms.find(room => room.home === 'W1N1').rootInLabs <= 15));
  assert.deepEqual(records['tasks/boost-courier-second'].data.queue,[]);
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
}
module.exports = { changeEmpireOwnership,verifyEmpireLoss };
