const assert = require('node:assert/strict');
const { remoteAssessmentWorld } = require('./remote-assessment.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteManagementWorld(server,bot) { await remoteAssessmentWorld(server,bot); }
async function changeRemoteManagement(server,bot,modules,index) {
  const { db } = await server.world.load();
  if (index === 5) await server.world.addRoomObject('E0N1','creep',35,35,{ name: 'management-threat',user: '2',body: [{ type: 'move',hits: 100 }],
    store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  if (index === 9) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'management-threat' });
  if (index === 29) await db['rooms.objects'].removeWhere({ room: 'W0N1',type: 'extension' });
  if (index === 33) for (let x=20; x<25; x++) await server.world.addRoomObject('W0N1','extension',x,20,
    { user: bot.id,store: { energy: 50 },storeCapacityResource: { energy: 50 },hits: 1000,hitsMax: 1000 });
  if (index === 39 || index === 43) await db['rooms.objects'].update({ room: 'E0N1',type: 'controller' },
    { $set: { reservation: index === 39 ? { user: '2',endTime: Number(await server.world.gameTime)+100 } : null } });
  if (index === 47) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'remote-assessment-witness' });
  return reloadStampDraft(server,bot,modules,index,[1,7,15,26,34,45]);
}
function verifyRemoteManagement(memory,evidence) {
  const rows = memory.remoteManagementRows;
  evidence.remoteManagement = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,56); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(rows[0].sourceIndex,1); assert.equal(rows[0].lease,null);
  for (let index=1; index<rows.length; index++) if (rows[index].startedAt === rows[index-1].startedAt) assert.ok(rows[index].sourceIndex-rows[index-1].sourceIndex <= 1);
  assert.equal(rows[1].sourceIndex,2); assert.equal(rows[1].lease.plan.sources.length,2);
  assert.ok(rows.filter(row => row.tick >= 2 && row.tick < 6).every(row => row.lease.generation === rows[1].lease.generation),'ordinary renewal retains generation');
  assert.ok(rows.filter(row => row.tick >= 6 && row.tick < 10).every(row => !row.lease),'hostile pressure prevents lease publication');
  assert.ok(rows.some(row => row.tick >= 10 && row.tick < 15 && row.lease),'safe reassessment recovers');
  assert.ok(rows.some(row => row.tick >= 16 && row.tick < 22 && row.lease?.plan.sources.length === 1),'capacity policy selects a source fragment');
  assert.ok(rows.filter(row => row.tick >= 23 && row.tick < 26).every(row => !row.lease),'zero budget removes only managed assignments');
  assert.ok(rows.some(row => row.tick >= 27 && row.tick < 30 && row.lease?.plan.sources.length === 2));
  assert.ok(rows.filter(row => row.tick >= 30 && row.tick < 34).every(row => !row.lease),'unaffordable retained bodies cannot renew leases');
  assert.ok(rows.some(row => row.tick >= 34 && row.tick < 40 && row.lease));
  assert.ok(rows.filter(row => row.tick >= 40 && row.tick < 44).every(row => !row.lease),'foreign reservation suspends automation');
  assert.ok(rows.some(row => row.tick >= 44 && row.tick < 48 && row.lease));
  assert.ok(rows.filter(row => row.tick >= 52).every(row => !row.visible && !row.lease),'stale lost vision cannot renew leases');
  for (const row of rows) {
    assert.deepEqual(row.sentinel,rows[0].sentinel);
    if (row.tick < 24) assert.deepEqual(row.manual,rows[0].manual);
    else assert.equal(row.manual,null,'manual expiry must not be extended by management');
  }
  const quotes = rows[1].offers[0].quotes.map(quote => quote.assessment).sort((a,b) => a.travel.outboundTicks-b.travel.outboundTicks);
  assert.ok(quotes[1].travel.outboundTicks > quotes[0].travel.outboundTicks);
  assert.ok(quotes[1].economics.energy.hauling > quotes[0].economics.energy.hauling);
  assert.deepEqual(memory.stampReloads,[2,8,16,27,35,46]);
}
module.exports = { remoteManagementWorld,changeRemoteManagement,verifyRemoteManagement };
