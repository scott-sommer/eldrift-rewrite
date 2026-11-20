const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function labReactionsWorld(server,bot,mode) {
  await server.world.setTerrain('W0N1',new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1',type: 'controller' },{ $set: { level: 8,downgradeTime: 20000 } });
  const outputs = mode === 'invalid' ? [[30,30],[31,30]] : [[19,21],[21,21]];
  for (const [x,y,mineral] of [[20,20,'H'],[20,22,'O'],[20,21,null],...outputs.map(([x,y]) => [x,y,null])]) {
    const store = mineral ? { [mineral]: 20 } : {};
    await server.world.addRoomObject('W0N1','lab',x,y,{ user: bot.id,store,
      storeCapacityResource: { energy: 2000,...(mineral ? { [mineral]: 3000 } : {}) },
      storeCapacity: mineral ? null : 5000,hits: 500,hitsMax: 500,cooldownTime: 0 });
  }
}
async function changeLabReactions(server,index,mode) {
  if (mode !== 'destroy' || index !== 6) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1',type: 'lab',x: 20,y: 20 });
}
function verifyLabReactions(memory,mode,evidence) {
  const rows = memory.labReactions; evidence.labReactions = { mode,rows,reloads: memory.stampReloads };
  assert.equal(rows.length,25); assert.ok(rows.every(row => row.reserved === 0),'Reserved boost lab cannot react');
  assert.equal(rows[0].product,0,'Issued intents are not immediate production');
  assert.deepEqual(memory.stampReloads,[6]);
  if (mode === 'invalid') { assert.ok(rows.every(row => row.product === 0)); return; }
  assert.equal(rows[1].product,10,'Only the two unreserved output labs react');
  assert.ok(rows.slice(1,20).every(row => row.product === 10),'Cooldown and reset cannot replay production');
  assert.ok(rows[1].cooldowns.some(value => value > 0));
  const last = rows.at(-1);
  assert.equal(last.product,mode === 'destroy' ? 10 : 15);
  assert.equal(last.oxygen,mode === 'destroy' ? 10 : 5);
  assert.equal(last.hydrogen,mode === 'destroy' ? 0 : 5);
  assert.ok(rows.every(row => row.product <= 15),'Target cannot be overproduced');
}
module.exports = { labReactionsWorld,changeLabReactions,verifyLabReactions };
