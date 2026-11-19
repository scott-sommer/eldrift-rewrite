const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { remoteTransportWorld } = require('./remote-transport.cjs');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function remoteReturnWorld(server,bot) {
  await remoteTransportWorld(server,bot);
  const { db } = await server.world.load();
  for (const type of ['source','container','creep']) await db['rooms.objects'].removeWhere({ room: 'E0N1',type });
  const terrain = new TerrainMatrix();
  for (let x=0; x<50; x++) for (let y=0; y<50; y++) terrain.set(x,y,'swamp');
  for (let n=0; n<50; n++) { terrain.set(0,n,'plain'); terrain.set(49,n,'plain'); terrain.set(n,0,'plain'); terrain.set(n,49,'plain'); }
  await server.world.setTerrain('E0N1',terrain);
  await server.world.addRoomObject('E0N1','source',16,25,{ energy: 1500,energyCapacity: 1500,ticksToRegeneration: 300 });
  await server.world.addRoomObject('E0N1','container',15,25,{ store: { energy: 0 },storeCapacity: 2000,hits: 250000,hitsMax: 250000,nextDecayTime: 1000 });
  await server.world.addRoomObject('E0N1','creep',15,25,{ name: 'swamp-return-miner',user: bot.id,
    body: ['work','work','work','work','carry','move','move'].map(type => ({ type,hits: 100 })),
    store: { energy: 50 },storeCapacity: 50,hits: 700,hitsMax: 700,spawning: false,fatigue: 0,ageTime: 220 });
}
async function changeRemoteReturn(server,bot,modules,index) {
  await server.driver.activateRoom(['W0N1','E0N1']);
  return reloadStampDraft(server,bot,modules,index,[19,100,205]);
}
async function verifyRemoteReturn(memory,evidence,server) {
  const rows = memory.returnRows, quote = memory.returnQuote, first = rows[0], last = rows.at(-1);
  evidence.remoteReturn = { rows,quote,reloads: memory.stampReloads,receipts: memory.returnReceipts };
  assert.equal(rows.length,260); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(quote.status,'assessed'); assert.ok(quote.travel.minerReturnTicks > quote.travel.minerTicks);
  assert.ok(first.unit.ttl <= quote.economics.timing.miner.retireTicks,'loaded reserve must trigger retirement');
  assert.ok(first.unit.ttl > quote.travel.minerTicks+25,'old unloaded allowance would continue service');
  assert.equal(first.unit.cargo,50); assert.equal(first.unit.room,'E0N1');
  const delivered = rows.find(row => row.credited === 50);
  assert.ok(delivered && delivered.unit && delivered.unit.ttl > 0,'all loaded cargo must be physically delivered and confirmed before natural expiry');
  assert.equal(delivered.unit.room,'W0N1'); assert.equal(delivered.unit.cargo,0);
  assert.equal(delivered.unit.journal.acknowledged,true);
  assert.deepEqual(delivered.unit.journal.result,{ status: 'observed',amount: 50 });
  assert.ok(rows.filter(row => row.unit?.room === 'E0N1').every(row => row.unit.cargo === 50),'return travel must preserve the entire initial load');
  assert.ok(delivered.tick <= quote.travel.minerReturnTicks+25,'observed return and banking must fit the quoted reserve');
  assert.ok(rows.some(row => row.unit?.fatigue > 0),'native swamp fatigue must actually occur');
  assert.equal(last.unit,null,'initially aged miner must actually expire naturally'); assert.equal(last.storage,50); assert.equal(last.credited,50); assert.equal(last.claims,0);
  for (const row of rows) { assert.deepEqual(row.pending,first.pending); assert.deepEqual(row.sentinel,first.sentinel); }
  assert.deepEqual(memory.stampReloads,[20,101,206]);
  const { db } = await server.world.load();
  const source = await db['rooms.objects'].findOne({ room: 'E0N1',type: 'source' }), container = await db['rooms.objects'].findOne({ room: 'E0N1',type: 'container' });
  assert.equal(source.energy,1500); assert.equal(container.store.energy,0,'retired actor cannot hand its loaded cargo to the source container');
}
module.exports = { remoteReturnWorld,changeRemoteReturn,verifyRemoteReturn };
