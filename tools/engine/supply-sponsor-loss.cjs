const assert = require('node:assert/strict');
const { supportTransportWorld } = require('./support-transport.cjs');
async function sponsorLossWorld(server, bot) { await supportTransportWorld(server, bot); }
async function loseSupplySponsor(server, tick) {
  if (tick !== 1) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { user: null, level: 0 } });
}
function verifySponsorLoss(memory) {
  const rows = memory.sponsorLoss, last = rows.at(-1);
  console.log('SPONSOR_LOSS_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.ok(rows.some(row => row.cargo === 30 && row.recovery), 'loaded courier enters persistent sponsor-loss recovery');
  assert.ok(rows.some(row => row.recovery && row.transfer.result?.status === 'observed' && row.transfer.attempt.kind === 'withdraw'
    && row.transfer.acknowledged), 'pending collection is settled before handoff');
  assert.ok(rows.filter(row => row.tick >= 3 && row.tick < 10).every(row => row.cargo === 30 && row.owner.startsWith('upgrade-supply:')),
    'no eligible refuge retains cargo and route identity');
  assert.equal(last.home, 'E0N1');
  assert.equal(last.owner, 'logistics:"E0N1"');
  assert.equal(last.room, 'E0N1');
  assert.equal(last.cargo, 0);
  assert.equal(last.target, 30);
  assert.equal(last.source, 70);
  assert.equal(last.recovery, null);
  assert.ok(rows.every(row => row.ground === 0), 'recovery does not discard energy');
}
module.exports = { sponsorLossWorld, loseSupplySponsor, verifySponsorLoss };
