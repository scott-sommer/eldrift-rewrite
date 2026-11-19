const assert = require('node:assert/strict');
const { remoteTransportWorld } = require('./remote-transport.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteRoadAutoWorld(server,bot) {
  await remoteTransportWorld(server,bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 3000 } } });
}
async function changeRemoteRoadAuto(server,bot,modules,index) {
  await server.driver.activateRoom(['W0N1','E0N1']);
  return reloadStampDraft(server,bot,modules,index,[10,100,300]);
}
function verifyRemoteRoadAuto(memory,evidence) {
  const rows = memory.autoRoadRows, first = rows[0], last = rows.at(-1);
  evidence.remoteRoadAuto = { rows,reloads: memory.stampReloads,births: memory.autoRoadBirths,refunds: memory.autoRoadRefunds };
  assert.equal(rows.length,450); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(first.units.length,0,'fixture must not seed an existing builder');
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)),'main loop must actually spawn the builder');
  assert.equal(Object.keys(memory.autoRoadBirths).length,1); assert.equal(last.birthCost,300); assert.equal(last.spawnEnergy,1000);
  assert.ok(last.roads.some(road => road.room === 'E0N1' && road.x <= 2),'automatically recruited builder must complete a remote road');
  assert.ok(last.revoked); const revoked = rows.find(row => row.tick === last.revoked);
  assert.ok(revoked.units.some(unit => unit.room === 'E0N1' && unit.cargo > 0));
  assert.ok(last.refunded > 0); assert.equal(last.cargo,0); assert.equal(last.claims,0);
  assert.ok(last.units.every(unit => unit.room === 'W0N1' && unit.tasks.length === 0 && !unit.spawning));
  const unrelated = first.pending.find(request => request.id === 'unrelated-auto-road');
  for (const row of rows) {
    assert.equal(row.storage+row.cargo+row.roads.length*300+row.progress,3000,'construction funding/refund must balance separately from spawn stock');
    assert.deepEqual(row.pending.find(request => request.id === unrelated.id),unrelated); assert.deepEqual(row.sentinel,first.sentinel);
    assert.ok(row.units.length <= 1,'configured construction population ceiling must hold');
  }
  assert.equal(last.pending.length,1); assert.deepEqual(memory.stampReloads,[11,101,301]);
}
function verifyRemoteRoadAdmission(memory,evidence) {
  const rows = memory.autoRoadRows, first = rows[0], last = rows.at(-1);
  evidence.remoteRoadAdmission = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,160); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(rows.every(row => row.units.length === 0 && row.birthCost === 0 && row.progress === 0 && row.roads.length === 0));
  assert.ok(rows.every(row => row.storage === 3000 && row.spawnEnergy === 1300 && row.pending.length === 1),'underfunded, disabled and unaffordable stages must not spend capital or queue builders');
  assert.deepEqual(last.pending,first.pending); assert.deepEqual(last.sentinel,first.sentinel); assert.deepEqual(memory.stampReloads,[11,101]);
}
module.exports = { remoteRoadAutoWorld,changeRemoteRoadAuto,verifyRemoteRoadAuto,verifyRemoteRoadAdmission };
