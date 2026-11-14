const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { recoveryScavengingWorld } = require('./recovery-scavenging.cjs');
async function recoveryBankingWorld(server, bot) {
  await recoveryScavengingWorld(server, bot);
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'tombstone' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'energy' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6 } });
  for (const [type, x, y] of [['container', 16, 15], ['link', 17, 15], ['lab', 18, 15], ['terminal', 18, 16]]) {
    await server.world.addRoomObject('W0N1', type, x, y, { user: bot.id, store: { energy: 40, H: type === 'lab' ? 70 : 0 },
      storeCapacity: type === 'terminal' ? 300000 : 2000, storeCapacityResource: type === 'lab' ? { energy: 2000, H: 3000 } : undefined,
      hits: 1000, hitsMax: 1000, cooldown: 0, nextDecayTime: 1000 });
  }
}
function verifyRecoveryBanking(memory) {
  const rows = memory.recoveryBanking;
  const last = rows.at(-1);
  console.log('RECOVERY_BANKING_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.equal(last.stored, 160);
  assert.equal(last.cargo, 0);
  assert.ok(last.sources.every(source => source.energy === 0));
  assert.equal(last.sources.find(source => source.kind === 'lab').hydrogen, 70);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  const bank = records.filter(record => record.request.owner.endsWith(':recovery-bank'));
  assert.equal(new Set(bank.map(record => record.request.source)).size, 4);
  assert.equal(bank.flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0), 160);
  assert.ok(records.every(record => record.request.resource === 'energy'));
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
  assert.deepEqual(memory.eldrift.records['tasks/rescuer'].data.queue, []);
}
module.exports = { recoveryBankingWorld, verifyRecoveryBanking };
