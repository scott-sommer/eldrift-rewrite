const assert = require('node:assert/strict');
const { remoteReservationWorld } = require('./remote-reservation.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteMiningWorld(server,bot) {
  await remoteReservationWorld(server,bot);
  await server.world.addRoomObject('E0N1','source',6,25,{ energy: 1500,energyCapacity: 1500,ticksToRegeneration: 300 });
  await server.world.addRoomObject('E0N1','container',5,25,{ store: { energy: 0 },storeCapacity: 2000,hits: 250000,hitsMax: 250000,nextDecayTime: 1000 });
}
async function changeRemoteMining(server,bot,modules,index) {
  const { db } = await server.world.load();
  if (index === 1) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'reservation-witness' });
  if (index === 29) await server.world.addRoomObject('E0N1','creep',15,30,{ name: 'mining-threat',user: '2',
    body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  if (index === 44) {
    await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'mining-threat' });
    await server.world.addRoomObject('E0N1','creep',10,40,{ name: 'mining-refresh',user: bot.id,
      body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  }
  return reloadStampDraft(server,bot,modules,index,[19,55,94]);
}
function verifyRemoteMining(memory,evidence) {
  const rows = memory.remoteMiningRows;
  evidence.remoteMining = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,130); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.deepEqual(memory.stampReloads,[20,56,95]);
  assert.ok(rows.some(row => !row.visible && row.tick > 2 && row.tick < 25 && row.units.some(unit => !unit.spawning)),'approach must work from retained intel before live station acquisition');
  assert.ok(rows.some(row => row.tick < 30 && row.sourceEnergy < 1500 && row.sourceEnergy !== null),'source energy must actually be harvested before the threat');
  assert.ok(rows.filter(row => row.tick >= 30 && row.tick < 45).every(row => row.tileClaims.length === 0),'unsafe work must release its station tile immediately');
  assert.ok(rows.some(row => row.tick >= 35 && row.tick < 45 && !row.visible && row.units.some(unit => unit.room === 'W0N1')),'retreat and vision loss must not authorize unseen extraction');
  assert.ok(rows.some(row => row.tick > 45 && row.tick < 89 && row.containerEnergy > 0),'fresh safe intel must restore harvesting and actual container handoff');
  assert.ok(rows.some(row => row.tick >= 89 && row.units.some(unit => unit.cargo > 0)),'retirement must exercise carried energy preservation');
  assert.ok(rows.filter(row => row.tick >= 89).every(row => !row.authority && row.tileClaims.length === 0 && row.pending === 0));
  assert.ok(rows.slice(-5).every(row => row.units.every(unit => unit.room === 'W0N1' && unit.tasks === 0)),'expired authority must finish its return task');
  const stopped = rows.filter(row => !row.authority), snapshot = stopped[0];
  assert.equal(snapshot.tick,89); assert.ok(snapshot.units[0].cargo > 0);
  assert.ok(stopped.every(row => row.sourceEnergy === snapshot.sourceEnergy && row.containerEnergy === snapshot.containerEnergy),'revoked extraction cannot continue harvesting or handing off');
  assert.ok(stopped.every(row => row.units[0].cargo === snapshot.units[0].cargo),'return travel must preserve actual cargo');
  const last = rows.at(-1).units[0]; assert.ok(last.cargo > 0,'returned miner must retain its cargo until shared banking takes ownership');
  for (const row of rows) assert.deepEqual(row.sentinel,rows[0].sentinel);
  const stable = rows.filter(row => row.tick > 60 && row.tick < 89 && row.tileClaims.length === 1).map(row => row.tileClaims[0].resource);
  assert.ok(stable.length > 5); assert.equal(new Set(stable).size,1,'live tile ownership must remain stable across resets');
}
module.exports = { remoteMiningWorld,changeRemoteMining,verifyRemoteMining };
