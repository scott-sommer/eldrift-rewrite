const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteReservationWorld(server,bot) {
  for (let x=-4; x<=2; x++) for (let y=-5; y<=1; y++) {
    const room = `${x<0?'W'+(-x-1):'E'+x}${y<0?'N'+(-y-1):'S'+y}`;
    if (room !== 'W0N1') await server.world.addRoom(room);
    await server.world.setTerrain(room,new TerrainMatrix());
  }
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 4,downgradeTime: 20000 } });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'spawn' },{ $set: { x: 47,y: 25 } });
  for (let index=0; index<20; index++) await server.world.addRoomObject('W0N1','extension',20+index%5,20+Math.floor(index/5),
    { user: bot.id,store: { energy: 50 },storeCapacityResource: { energy: 50 },hits: 1000,hitsMax: 1000 });
  await server.world.addRoomObject('E0N1','controller',3,25,{ user: null,level: 0 });
  await server.world.addRoomObject('E0N1','creep',10,40,{ name: 'reservation-witness',user: bot.id,
    body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
}
async function changeRemoteReservation(server,bot,modules,index) {
  const { db } = await server.world.load();
  if (index === 29) await server.world.addRoomObject('E0N1','creep',15,30,{ name: 'reservation-threat',user: '2',
    body: [{ type: 'move',hits: 100 }],store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 });
  if (index === 44) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'reservation-threat' });
  if (index === 65) {
    const now = Number(await server.world.gameTime);
    const creeps = await db['rooms.objects'].find({ type: 'creep',user: bot.id });
    for (const creep of creeps.filter(item => item.name !== 'reservation-witness')) await db['rooms.objects'].update({ _id: creep._id },{ $set: { ageTime: now+10 } });
    const structures = await db['rooms.objects'].find({ room: 'W0N1',user: bot.id });
    for (const structure of structures.filter(item => ['spawn','extension'].includes(item.type))) {
      await db['rooms.objects'].update({ _id: structure._id },{ $set: { store: { energy: structure.type === 'spawn' ? 300 : 50 } } });
    }
  }
  return reloadStampDraft(server,bot,modules,index,[23,55,90]);
}
function verifyRemoteReservation(memory,evidence) {
  const rows = memory.remoteReservationRows;
  evidence.remoteReservation = { rows,reloads: memory.stampReloads };
  assert.equal(rows.length,140); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.deepEqual(memory.stampReloads,[24,56,91]);
  assert.ok(rows.some(row => row.reservation?.ticksToEnd > 2),'native controller reservation must actually grow');
  assert.ok(rows.every(row => row.calls.every(call => call.duplicate === -4)),'same-tick reset cannot issue a duplicate reserve intent');
  assert.ok(rows.filter(row => row.tick >= 30 && row.tick < 45).every(row => row.calls.length === 0),'current hostile pressure suspends controller work');
  assert.ok(rows.some(row => row.tick >= 35 && row.tick < 45 && row.units.some(unit => !unit.spawning && unit.room === 'W0N1')),'threatened reserver must retreat');
  assert.ok(rows.some(row => row.tick >= 45 && row.tick < 65 && row.calls.some(call => call.code === 0)),'safe service must recover');
  const initial = rows.flatMap(row => row.units).find(unit => !unit.spawning)?.name;
  assert.ok(rows.some(row => row.tick >= 66 && row.units.some(unit => unit.name === initial) && row.units.some(unit => unit.name !== initial && unit.spawning)),'replacement spawns before the low-TTL incumbent dies');
  assert.ok(rows.some(row => row.tick > 78 && row.calls.some(call => call.unit !== initial && call.code === 0)),'replacement must reach and reserve the actual controller');
  assert.ok(rows.filter(row => row.tick >= 110).every(row => !row.authority && row.calls.length === 0 && row.pending === 0));
  assert.ok(rows.slice(-5).every(row => row.units.every(unit => unit.room === 'W0N1' && unit.tasks === 0)),'expired authority must finish retreat and release its task');
  for (const row of rows) assert.deepEqual(row.witness,rows[0].witness);
}
module.exports = { remoteReservationWorld,changeRemoteReservation,verifyRemoteReservation };
