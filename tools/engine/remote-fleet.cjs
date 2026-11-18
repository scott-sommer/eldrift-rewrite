const assert = require('node:assert/strict');
const { remoteTransportWorld } = require('./remote-transport.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteFleetWorld(server,bot,mode) {
  await remoteTransportWorld(server,bot);
  if (mode === 'bootstrap') {
    const { db } = await server.world.load();
    await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'container' });
  }
}
function createRemoteFleetChanges(mode) {
  const seen = new Set(), metadata = { mode,confirmationResets: [],replacement: null,damage: null };
  async function change(server,bot,modules,index) {
    const { db } = await server.world.load();
    if (index === 1) await db['rooms.objects'].removeWhere({ room: 'E0N1',type: 'creep',name: 'reservation-witness' });
    const memory = JSON.parse((await bot.memory) || '{}'), row = memory.remoteFleetRows?.at(-1), now = Number(await server.world.gameTime);
    if (mode === 'replacement' && !metadata.replacement && row?.credited >= 100 && row.tick >= 100) {
      const unit = row.units.find(unit => unit.kind === 'courier' && !unit.spawning);
      if (unit) { await db['rooms.objects'].update({ _id: unit.id },{ $set: { ageTime: now+40 } }); metadata.replacement = { id: unit.id,tick: now,deathAt: now+40,before: row.units.filter(unit => unit.kind === 'courier').map(unit => unit.id) }; }
    }
    if (mode === 'damage' && !metadata.damage && row?.credited >= 100 && row.tick >= 100) {
      const unit = row.units.find(unit => unit.kind === 'courier' && !unit.spawning);
      if (unit) {
        const actual = await db['rooms.objects'].findOne({ _id: unit.id }), body = actual.body.map(part => ({ ...part }));
        const partIndex = body.findIndex(part => part.type === 'move' && part.hits > 0);
        assert.ok(partIndex >= 0); const lost = body[partIndex].hits; body[partIndex].hits = 0;
        await db['rooms.objects'].update({ _id: unit.id },{ $set: { body,hits: actual.hits-lost } });
        metadata.damage = { id: unit.id,tick: now,partIndex,before: row.units.filter(unit => unit.kind === 'courier').map(unit => unit.id) };
      }
    }
    const pending = row?.units.find(unit => unit.journal && !unit.journal.acknowledged && unit.journal.tick === row.tick);
    if (pending && !seen.has(pending.journal.id)) {
      seen.add(pending.journal.id); metadata.confirmationResets.push(now); return reloadStampDraft(server,bot,modules,index,[index]);
    }
    return reloadStampDraft(server,bot,modules,index,[12]);
  }
  return { change,metadata };
}
async function verifyRemoteFleet(memory,evidence,metadata,server) {
  const rows = memory.remoteFleetRows, last = rows.at(-1);
  evidence.remoteFleet = { rows,metadata,reloads: memory.stampReloads,receipts: memory.remoteFleetReceipts,bindings: memory.remoteFleetBindings };
  assert.equal(rows.length,metadata.mode === 'bootstrap' ? 1500 : metadata.mode === 'budget' ? 280 : 260); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.ok(last.revokedAt >= 180); assert.ok(last.credited >= 200);
  assert.ok(rows.some(row => row.units.some(unit => unit.kind === 'miner' && unit.room === 'E0N1' && unit.tasks.includes('remote-mine'))));
  assert.ok(rows.some(row => row.units.some(unit => unit.kind === 'courier' && unit.tasks.includes('haul'))));
  assert.ok(last.units.every(unit => unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks.length === 0 && !unit.spawning));
  assert.equal(last.quantities,0); assert.equal(last.miningClaims,0);
  let passiveEnergy = 0;
  for (let index=0; index<rows.length-1; index++) {
    const current = rows[index], next = rows[index+1], spent = next.birthCost-current.birthCost;
    const generated = current.spawnEnergy-spent < 300 ? 1 : 0; passiveEnergy += generated;
    assert.equal(next.spawnEnergy,current.spawnEnergy-spent+generated,'pinned engine passive spawn generation must match each observed step');
    assert.ok(next.storageEnergy >= next.credited,'credit cannot precede physical home stock');
    const pending = next.units.filter(unit => unit.journal?.kind === 'transfer' && !unit.journal.acknowledged).reduce((sum,unit) => sum+unit.journal.amount,0);
    assert.ok(next.storageEnergy-next.credited <= pending,'uncredited physical home stock must be bounded by pending confirmations');
  }
  evidence.remoteFleet.passiveSpawnEnergy = passiveEnergy;
  evidence.remoteFleet.maximumUncreditedPhysical = Math.max(...rows.map(row => row.storageEnergy-row.credited));
  assert.equal(last.storageEnergy,last.credited,'final confirmed ledger must exactly match home storage');
  assert.equal(last.homeTotal,1300-last.birthCost+last.credited+passiveEnergy,'home inventory must separate births, confirmed deliveries and passive spawn energy');
  const { db } = await server.world.load(), source = await db['rooms.objects'].findOne({ room: 'E0N1',type: 'source' });
  const container = await db['rooms.objects'].findOne({ room: 'E0N1',type: 'container' });
  evidence.remoteFleet.finalWorld = { sourceEnergy: source.energy,containerEnergy: container.store.energy };
  if (metadata.mode !== 'bootstrap') assert.equal(1500-source.energy,last.credited+container.store.energy,'all harvested energy must be conserved after retirement');
  else {
    const sites = rows.flatMap(row => row.sites.filter(site => site.type === 'container'));
    assert.equal(rows[0].containerEnergy,null,'bootstrap must not seed a container');
    assert.ok(sites.some(site => site.progress > 0),'recruited miner must actually build the site');
    assert.ok(sites.some(site => site.progress >= site.total-50),'build progress must approach completion');
    assert.ok(container && sites.some(site => site.x === container.x && site.y === container.y),'native container must match an automatically built site');
    assert.ok(rows.some(row => row.containerEnergy > 0),'completed container must receive mined energy');
    evidence.remoteFleet.bootstrap = { firstSite: rows.find(row => row.sites.length)?.tick,firstProgress: rows.find(row => row.sites.some(site => site.progress > 0))?.tick,firstContainer: rows.find(row => row.containerEnergy !== null)?.tick,firstCredit: rows.find(row => row.credited > 0)?.tick };
  }
  const unrelated = rows[0].pending.find(request => request.id === 'unrelated-request');
  for (const row of rows) {
    assert.deepEqual(row.sentinel,rows[0].sentinel);
    assert.deepEqual(row.pending.find(request => request.id === 'unrelated-request'),unrelated);
  }
  assert.equal(last.pending.length,1); assert.ok(metadata.confirmationResets.length >= 4);
  for (const tick of metadata.confirmationResets) assert.ok(memory.stampReloads.includes(tick));
  if (metadata.mode === 'cancel') {
    assert.ok(last.cancelled); const { tick,name } = last.cancelled;
    assert.ok(rows.filter(row => row.tick > tick).every(row => !row.units.some(unit => unit.name === name)),'cancelled spawning worker must actually disappear');
    assert.ok(rows.some(row => row.tick > tick+6 && row.units.some(unit => unit.kind === 'miner' && !unit.spawning)));
  }
  if (metadata.mode === 'damage') {
    assert.ok(metadata.damage);
    const damage = metadata.damage;
    assert.ok(rows.some(row => row.tick > damage.tick && row.units.some(unit => unit.id === damage.id && unit.moves === 1)),'the fixture must actually remove movement capacity');
    assert.ok(rows.some(row => row.tick > damage.tick && row.tick <= damage.tick+40 && row.units.some(unit => unit.kind === 'courier' && !damage.before.includes(unit.id) && !unit.spawning && unit.room === 'E0N1')));
    assert.ok(rows.some(row => row.tick > damage.tick && row.units.some(unit => unit.id === damage.id && unit.room === 'W0N1' && unit.cargo === 0 && unit.tasks.length === 0)),'damaged unit must return its cargo safely');
  }
  if (metadata.mode === 'replacement') {
    assert.ok(metadata.replacement);
    const replacement = metadata.replacement;
    assert.ok(rows.some(row => row.tick < replacement.deathAt && row.units.some(unit => unit.kind === 'courier' && !replacement.before.includes(unit.id) && !unit.spawning && unit.room === 'E0N1')),'replacement must arrive before controlled old-worker death');
    assert.ok(rows.some(row => row.tick >= replacement.deathAt && !row.units.some(unit => unit.id === replacement.id)));
  }
}
module.exports = { remoteFleetWorld,createRemoteFleetChanges,verifyRemoteFleet };
