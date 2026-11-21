const assert = require('node:assert/strict');
const { labSupplyWorld } = require('./lab-supply.cjs');
async function mineralIndustryWorld(server,bot) {
  await labSupplyWorld(server,bot,'depleted'); const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1',type: 'source' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1',type: 'mineral' });
  await db['rooms.objects'].update({ room: 'W0N1',type: 'storage' },{ $set: { store: { energy: 100000,O: 20 } } });
  await server.world.addRoomObject('W0N1','mineral',18,15,{ mineralType: 'H',mineralAmount: 15,density: 1 });
  await server.world.addRoomObject('W0N1','extractor',18,15,{ user: bot.id,hits: 500,hitsMax: 500,cooldown: 0 });
  await server.world.addRoomObject('W0N1','container',17,15,{ store: {},storeCapacity: 2000,hits: 250000,hitsMax: 250000,nextDecayTime: 1000 });
}
function verifyMineralIndustry(memory,evidence) {
  const rows = memory.mineralIndustryRows, first = rows[0], last = rows.at(-1), records = memory.eldrift.records;
  evidence.mineralIndustry = { rows,reloads: memory.stampReloads,pendingReload: evidence.mineralIndustryReload };
  assert.equal(rows.length,640); assert.deepEqual(memory.stampReloads,[...new Set([31,121,401,evidence.mineralIndustryReload.tick])].sort((a,b) => a-b));
  assert.equal(first.minersBefore,0); assert.ok(first.miners.every(miner => miner.spawning),'Initial dispatch may expose only a spawning miner, never a seeded ready worker'); assert.equal(first.bankH+first.labH+first.containerH+first.cargoH+first.bankOH+first.labOH,0);
  assert.ok(rows.some(row => row.miners.some(miner => !miner.spawning)),'Ordinary mining demand must produce a real miner');
  assert.ok(rows.every(row => row.mineral+row.containerH+row.bankH+row.labH+row.cargoH+row.bankOH+row.labOH+row.cargoOH === 15),'Newly mined H must be conserved through actual stock and compound');
  const mined = rows.find(row => row.mineral < 15), banked = rows.find(row => row.mineralReceipts > 0), supplied = rows.find(row => row.labHReceipts > 0), reacted = rows.find(row => row.bankOH+row.labOH > 0);
  assert.ok(mined && banked && supplied && reacted); assert.ok(mined.tick < banked.tick && banked.tick < supplied.tick && supplied.tick < reacted.tick,'Native extraction and both transport receipts precede compound production');
  assert.equal(evidence.mineralIndustryReload.pending,true); assert.equal(last.mineralReceipts,15); assert.equal(last.labHReceipts,15);
  assert.equal(last.mineral+last.containerH+last.bankH+last.labH+last.cargoH+last.labOH+last.cargoOH,0); assert.equal(last.bankOH,15);
  assert.deepEqual(records['tasks/lab-courier'].data.queue,[]); assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 640).length,0);
}
module.exports = { mineralIndustryWorld,verifyMineralIndustry };
