const assert = require('node:assert/strict');
const { remoteMiningWorld,changeRemoteMining } = require('./remote-mining.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteBankingWorld(server,bot) {
  await remoteMiningWorld(server,bot);
  await server.world.addRoomObject('W0N1','storage',35,25,{ user: bot.id,store: { energy: 0 },storeCapacity: 1000000,hits: 10000,hitsMax: 10000 });
}
function createRemoteBankingChanges(mode) {
  const seen = new Set(), metadata = { mode,confirmationResets: [],sinkRemovedAt: null,filledAt: null,releasedAt: null,externalEnergy: 0 };
  async function change(server,bot,modules,index) {
    const base = await changeRemoteMining(server,bot,modules,index);
    if (index === 0) return base;
    const memory = JSON.parse((await bot.memory) || '{}'), last = memory.remoteBankingRows?.at(-1);
    if (!last) return base;
    const { db } = await server.world.load(), now = Number(await server.world.gameTime);
    if (mode === 'sink-loss' && !metadata.sinkRemovedAt && last.units.some(unit => unit.tasks[0]?.kind === 'haul' && !unit.journal)) {
      await db['rooms.objects'].removeWhere({ room: 'W0N1',type: 'storage' }); metadata.sinkRemovedAt = now;
    }
    if (mode === 'full' && !metadata.filledAt && last.units.some(unit => unit.room === 'W0N1' && unit.cargo > 0)) {
      const stores = await db['rooms.objects'].find({ room: 'W0N1',user: bot.id });
      for (const item of stores.filter(item => ['spawn','extension','storage'].includes(item.type))) {
        const capacity = item.type === 'storage' ? 1000000 : item.type === 'spawn' ? 300 : 50;
        metadata.externalEnergy += capacity - (item.store?.energy ?? 0);
        await db['rooms.objects'].update({ _id: item._id },{ $set: { store: { energy: capacity } } });
      }
      metadata.filledAt = now;
    }
    if (mode === 'full' && metadata.filledAt && index === 60) {
      const storage = await db['rooms.objects'].findOne({ room: 'W0N1',type: 'storage' });
      await db['rooms.objects'].update({ _id: storage._id },{ $set: { store: { energy: storage.store.energy - 1000 } } });
      metadata.externalEnergy -= 1000; metadata.releasedAt = now;
    }
    const pending = last.units.find(unit => unit.journal && !unit.journal.acknowledged && unit.journal.tick === last.tick);
    if (pending && !seen.has(pending.journal.id)) {
      seen.add(pending.journal.id); metadata.confirmationResets.push(now);
      return base ?? reloadStampDraft(server,bot,modules,index,[index]);
    }
    return base;
  }
  return { change,metadata };
}
function verifyRemoteBanking(memory,evidence,metadata) {
  const rows = memory.remoteBankingRows, receipts = memory.remoteBankingReceipts, last = rows.at(-1);
  evidence.remoteBanking = { rows,receipts,receiptBindings: memory.remoteBankingReceiptBindings,metadata,reloads: memory.stampReloads,skipped: memory.remoteBankingSkipped,
    requestState: memory.eldrift.records['logistics-requests/W0N1'] };
  assert.equal(rows.length,160); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(last.revokedAt >= 100); assert.equal(last.authority,false);
  assert.ok(last.units.every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks.length === 0),'retired worker must finish confirmed home banking');
  assert.equal(last.bankClaims,0); assert.equal(last.tileClaims,0); assert.ok(last.credited > 0);
  const allRecords = evidence.remoteBanking.requestState.data.records;
  assert.ok(allRecords.every(record => record.request.owner === 'fixture' || record.cancelled
    || record.receipts.reduce((sum,receipt) => sum + receipt.amount,0) === record.request.quantity),'bank requests must finish or cancel explicitly');
  const receiptIds = allRecords.flatMap(record => record.receipts).map(receipt => receipt.id);
  assert.equal(new Set(receiptIds).size,receiptIds.length,'a receipt cannot be credited across multiple requests');
  const uncertain = last.units.flatMap(unit => unit.uncertainty).reduce((sum,item) => sum + item.attempt.amount,0);
  const baseline = rows.find(row => row.tick === 30).homeTotal;
  assert.equal(last.homeTotal - baseline - metadata.externalEnergy,last.credited + uncertain,'physical home stock must agree with observed receipts plus explicitly uncertain effects');
  for (const row of rows) {
    assert.deepEqual(row.quantitySentinel,rows[0].quantitySentinel); assert.deepEqual(row.mutexSentinel,rows[0].mutexSentinel);
    assert.deepEqual(row.requestSentinel,rows[0].requestSentinel);
  }
  for (let index=1; index<rows.length; index++) if (rows[index].units.some(unit => unit.journal?.tick === rows[index].tick && !unit.journal.acknowledged)) {
    assert.equal(rows[index].credited,rows[index-1].credited,'scheduling a transfer cannot credit it');
  }
  assert.ok(metadata.confirmationResets.length >= 2);
  for (const tick of metadata.confirmationResets) assert.ok(memory.stampReloads.includes(tick),'confirmation must survive an actual global reset');
  if (metadata.mode === 'gap') {
    assert.ok(memory.remoteBankingSkipped > 0); assert.ok(uncertain > 0);
    assert.ok(last.units.some(unit => unit.uncertainty.length === 1),'missed event window must archive uncertainty once');
  } else assert.equal(uncertain,0);
  if (metadata.mode === 'sink-loss') {
    assert.ok(metadata.sinkRemovedAt > 0);
    const records = evidence.remoteBanking.requestState.data.records;
    assert.ok(records.some(record => record.request.owner !== 'fixture' && record.cancelled && record.receipts.length === 0));
  }
  if (metadata.mode === 'full') {
    assert.ok(metadata.filledAt < metadata.releasedAt);
    assert.ok(rows.filter(row => row.tick >= metadata.filledAt && row.tick < metadata.releasedAt).every(row => row.bankClaims === 0 && row.credited === 0));
    assert.ok(rows.some(row => row.tick >= metadata.filledAt && row.tick < metadata.releasedAt && row.units.some(unit => unit.cargo > 0 && unit.tasks.length === 0)));
  }
}
module.exports = { remoteBankingWorld,createRemoteBankingChanges,verifyRemoteBanking };
