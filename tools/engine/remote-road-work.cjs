const assert = require('node:assert/strict');
const { remoteTransportWorld } = require('./remote-transport.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteRoadWorkWorld(server,bot) {
  await remoteTransportWorld(server,bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 3000 } } });
  await server.world.addRoomObject('W0N1','creep',46,25,{ name: 'road-worker',user: bot.id,
    body: ['work','carry','carry','move','move'].map(type => ({ type,hits: 100 })),store: {},storeCapacity: 100,
    hits: 500,hitsMax: 500,spawning: false,fatigue: 0,ageTime: 1500 });
}
async function changeRemoteRoadWork(server,bot,modules,index) {
  await server.driver.activateRoom(['W0N1','E0N1']);
  return reloadStampDraft(server,bot,modules,index,[19,100,250]);
}
function verifyRemoteRoadWork(memory,evidence) {
  const rows = memory.roadRows, first = rows[0], last = rows.at(-1);
  evidence.remoteRoadWork = { rows,reloads: memory.stampReloads,refunds: memory.roadRefunds };
  assert.equal(rows.length,400); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.some(row => row.progress > 0),'builder must issue real native construction');
  assert.ok(last.roads.some(road => road.room === 'E0N1' && road.x <= 2),'a remote road away from the source station must actually complete');
  assert.ok(last.revoked && rows.find(row => row.tick === last.revoked).cargo > 0,'withdrawal must retain unused construction energy');
  assert.equal(last.room,'W0N1'); assert.equal(last.cargo,0); assert.deepEqual(last.tasks,[]); assert.equal(last.claims,0);
  assert.ok(last.refunded > 0,'unused home-funded energy must be returned and confirmed as a refund, not remote income');
  for (const row of rows) {
    assert.equal(row.storage+row.cargo+row.roads.length*300+row.progress,3000,'home funding must equal remaining stock plus native construction energy');
    assert.deepEqual(row.pending,first.pending); assert.deepEqual(row.sentinel,first.sentinel);
  }
  const retired = rows.filter(row => row.tick > last.revoked+1);
  assert.ok(retired.every(row => row.roads.length === last.roads.length && row.progress === last.progress),'withdrawn work cannot continue building');
  assert.deepEqual(memory.stampReloads,[20,101,251]);
}
module.exports = { remoteRoadWorkWorld,changeRemoteRoadWork,verifyRemoteRoadWork };
