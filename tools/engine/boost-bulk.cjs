const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { boostRoleWorld } = require('./boost-roles.cjs');
async function boostBulkWorld(server,bot,mode) {
  await boostRoleWorld(server,bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1',name: 'boost-target' });
  await server.world.addRoom('W1N1'); await server.world.setTerrain('W1N1',new TerrainMatrix());
  const controller = await db['rooms.objects'].findOne({ room: 'W1N1',type: 'controller' });
  if (controller) await db['rooms.objects'].update({ _id: controller._id },{ $set: { user: bot.id,level: 7,progress: 0,downgradeTime: 20000 } });
  else await server.world.addRoomObject('W1N1','controller',20,23,{ user: bot.id,level: 7,progress: 0,downgradeTime: 20000 });
  const objects = await db['rooms.objects'].find({ room: 'W0N1' });
  for (const original of objects.filter(item => ['spawn','storage','lab','creep'].includes(item.type))) {
    if (mode === 'refused' && original.type === 'lab' && original.x === 17 && original.y === 20) continue;
    const copy = JSON.parse(JSON.stringify(original)); delete copy.$loki; delete copy.meta; delete copy._id; delete copy.room; delete copy.type; delete copy.x; delete copy.y;
    if (copy.name) copy.name += '-second';
    await server.world.addRoomObject('W1N1',original.type,original.x,original.y,copy);
  }
}
function verifyBoostBulk(memory,mode,evidence) {
  const rows = memory.boostBulkRows, result = memory.boostBulkResult, records = memory.eldrift.records;
  evidence.boostBulk = { mode,rows,result,reloads: memory.stampReloads };
  assert.equal(rows.length,320); assert.deepEqual(memory.stampReloads,[8,12,31,181]);
  assert.equal(result.dryRunUnchanged,true); assert.equal(result.reapplyUnchanged,true);
  assert.equal(result.ok,mode !== 'refused'); assert.deepEqual(result.rooms.map(room => room.home),['W0N1','W1N1']);
  if (mode === 'refused') assert.equal(result.refusalUnchanged,true);
  for (const home of ['W0N1','W1N1']) {
    const last = rows.at(-1).rooms.find(room => room.home === home);
    assert.equal(last.bankOH,10); assert.equal(last.cargo,0);
    assert.equal(records['tasks/'+last.courier].data.queue.length,0);
    if (mode === 'refused') {
      assert.equal(records['industry-boost-labs/'+home],undefined);
      assert.ok(rows.every(row => row.rooms.find(room => room.home === home).roles.length === 0));
    } else {
      assert.equal(last.roles.length,1); const lab = last.roles[0].lab;
      assert.ok(rows.every(row => !row.rooms.find(room => room.home === home).reactionLabs.includes(lab)));
      assert.equal(last.buffer.resource,'XGH2O'); assert.equal(last.buffer.amount,60); assert.equal(last.buffer.energy,40);
      assert.equal(last.bankX,60); assert.equal(last.bankK,10);
    }
  }
  assert.equal(records['quantity-reservations/empire'].data.claims.filter(claim => claim.expiresAt > 320).length,0);
}
module.exports = { boostBulkWorld,verifyBoostBulk };
