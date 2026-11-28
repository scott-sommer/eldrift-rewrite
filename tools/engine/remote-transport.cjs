const { verifyRemoteTransportRecovery } = require('./remote-transport-recovery.cjs');
const assert = require('node:assert/strict');
const { remoteMiningWorld } = require('./remote-mining.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteTransportWorld(server,bot,mode) {
  await remoteMiningWorld(server,bot);
  if (mode === 'drops') await server.world.addRoomObject('E0N1','energy',7,25,{ energy: 300,resourceType: 'energy' });
  await server.world.addRoomObject('W0N1','storage',45,25,{ user: bot.id,store: { energy: 0 },storeCapacity: 1000000,hits: 10000,hitsMax: 10000 });
}
function createRemoteTransportChanges(mode) {
  const seen = new Set(), metadata = { mode,threatAt: null,clearedAt: null,confirmationResets: [] };
  async function change(server,bot,modules,index) {
    const { db } = await server.world.load();
    if (index === 1) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'reservation-witness' });
    const memory = JSON.parse((await bot.memory) || '{}'), row = memory.remoteTransportRows?.at(-1), now = Number(await server.world.gameTime);
    const pending = row?.units.find(unit => unit.owner === 'transport-courier' && unit.journal && !unit.journal.acknowledged && unit.journal.tick === row.tick);
    if (mode === 'threat' && !metadata.threatAt && pending?.journal.kind === 'withdraw') {
      await server.world.addRoomObject('E0N1','creep',15,30,{ name: 'transport-threat',user: '2',body: [{ type: 'move',hits: 100 }],
        store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 }); metadata.threatAt = now;
    }
    if (metadata.threatAt && !metadata.clearedAt && now >= metadata.threatAt + 20) {
      await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'transport-threat' });
      await server.world.addRoomObject('E0N1','creep',10,40,{ name: 'transport-refresh',user: bot.id,body: [{ type: 'move',hits: 100 }],
        store: {},storeCapacity: 0,hits: 100,hitsMax: 100,spawning: false,fatigue: 0,ageTime: 1500 }); metadata.clearedAt = now;
    }
    if (pending && !seen.has(pending.journal.id)) {
      seen.add(pending.journal.id); metadata.confirmationResets.push(now);
      return reloadStampDraft(server,bot,modules,index,[index]);
    }
    return reloadStampDraft(server,bot,modules,index,[19]);
  }
  return { change,metadata };
}
async function verifyRemoteTransport(memory,evidence,metadata,server) {
  const rows = memory.remoteTransportRows, last = rows.at(-1), records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  evidence.remoteTransport = { rows,metadata,receipts: memory.remoteTransportReceipts,bindings: memory.remoteTransportBindings,records,reloads: memory.stampReloads };
  assert.equal(rows.length,240); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(last.revokedAt >= 140); assert.equal(last.authority,false); assert.ok(last.credited > 100);
  assert.ok(last.units.every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks.length === 0)); assert.equal(last.claims,0);
  assert.ok(rows.filter(row => row.containerEnergy !== null).every(row => row.stockReserved <= row.containerEnergy),'couriers must not overbook the shared container');
  const count = metadata.mode === 'contention' ? 2 : 1, baseline = 1300 - 350 - count*200;
  assert.equal(last.homeTotal-baseline,last.credited,'home stock and observed delivery receipts must match');
  const { db } = await server.world.load();
  const source = await db['rooms.objects'].findOne({ room: 'E0N1',type: 'source' });
  const container = await db['rooms.objects'].findOne({ room: 'E0N1',type: 'container' });
  evidence.remoteTransport.finalWorld = { sourceEnergy: source.energy,containerEnergy: container.store.energy };
  const pickups = new Map(rows.flatMap(row => row.units.filter(unit => unit.journal?.kind === 'pickup' && unit.journal.result?.status === 'observed')
    .map(unit => [unit.journal.id,unit.journal.result.amount])));
  const collected = [...pickups.values()].reduce((sum,amount) => sum+amount,0);
  assert.equal(1500-source.energy+collected,last.credited+container.store.energy,'harvested and collected energy must be conserved at retirement');
  if (metadata.mode === 'drops') {
    assert.ok(collected > 0,'a courier must confirm a real pickup');
    const remaining = (await db['rooms.objects'].find({ room: 'E0N1',type: 'energy' })).reduce((sum,item) => sum+item.energy,0);
    evidence.remoteTransport.finalWorld.drops = { initial: 300,collected,remaining,uncollectedLoss: 300-collected-remaining };
    assert.ok(300-collected-remaining >= 0);
  }
  assert.ok(records.every(record => record.cancelled || record.receipts.reduce((sum,item) => sum+item.amount,0) === record.request.quantity));
  const receipts = records.flatMap(record => record.receipts); assert.equal(new Set(receipts.map(item => item.id)).size,receipts.length);
  assert.ok(Object.values(memory.remoteTransportBindings).some(binding => JSON.parse(binding)[0].startsWith('logistics:["remote-transport"')));
  for (const tick of metadata.confirmationResets) assert.ok(memory.stampReloads.includes(tick));
  assert.ok(metadata.confirmationResets.length >= 4);
  const attempts = new Map(rows.flatMap(row => row.units.filter(unit => unit.owner === 'transport-courier' && unit.journal).map(unit => [unit.journal.id,unit.journal])));
  assert.ok([...attempts.values()].some(attempt => attempt.kind === 'withdraw'));
  if (metadata.mode === 'threat') {
    assert.ok(metadata.clearedAt > metadata.threatAt);
    evidence.remoteTransport.recovery = verifyRemoteTransportRecovery([...attempts.values()],metadata);
    assert.ok([...attempts.values()].filter(attempt => attempt.kind === 'withdraw').every(attempt => attempt.tick < metadata.threatAt || attempt.tick >= metadata.clearedAt));
    assert.ok(rows.some(row => row.tick > metadata.threatAt && row.tick < metadata.clearedAt && row.credited > 0),'loaded escape must finish delivery while collection is suspended');
  }
}
module.exports = { remoteTransportWorld,createRemoteTransportChanges,verifyRemoteTransport };
