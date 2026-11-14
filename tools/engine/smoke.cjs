const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ScreepsServer } = require('screeps-server-mockup');
const root = path.resolve(__dirname, '../..');
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
const directory = fs.mkdtempSync(path.join(root, 'artifacts/engine-'));
const server = new ScreepsServer({ path: directory, logdir: path.join(directory, 'logs'), port: 32147 });
let stopped = false;
function finish(code) {
  if (stopped) return;
  stopped = true;
  server.stop();
  process.exit(code);
}
const timeout = setTimeout(() => { console.error('Engine smoke exceeded 60 seconds', directory); finish(1); }, 60000);
server.on('error', error => { console.error(error); finish(1); });
(async () => {
  await server.world.reset();
  await server.world.stubWorld();
  const modules = { main: fs.readFileSync(path.join(root, 'dist/main.js'), 'utf8') };
  if (process.argv.includes('--inject-error')) modules.main += '\nconst original = module.exports.loop; module.exports = { loop: () => { original(); throw new Error("ENGINE_SENTINEL"); } };';
  const bot = await server.world.addBot({ username: 'eldrift-smoke', room: 'W0N1', x: 15, y: 15, modules });
  const messages = [];
  const errors = [];
  await server.common.storage.pubsub.subscribe(`user:${bot.id}/console`, event => {
    const payload = JSON.parse(event);
    messages.push(...(payload.messages?.log ?? []));
    if (payload.error) errors.push(payload.error);
  });
  await server.start();
  const initial = Number(await server.world.gameTime);
  for (let tick = 0; tick < 3; tick++) await server.tick();
  assert.deepEqual(errors, [], 'Engine reported bot exceptions');
  const memory = JSON.parse(await bot.memory);
  assert.equal(Number(await server.world.gameTime), initial + 3);
  assert.equal(memory.eldrift.format, 1);
  assert.equal(memory.eldrift.records['operator/config'].owner, 'operator');
  assert.deepEqual(messages, []);
  const report = { ticks: 3, initial, final: Number(await server.world.gameTime), memoryBytes: Buffer.byteLength(JSON.stringify(memory)), directory };
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  clearTimeout(timeout);
  finish(0);
})().catch(error => { console.error(error); clearTimeout(timeout); finish(1); });




