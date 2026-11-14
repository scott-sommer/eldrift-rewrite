const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
function provenance(root, source) {
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    dirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0,
    bundleSha256: createHash('sha256').update(source).digest('hex'),
    engineLockSha256: createHash('sha256').update(fs.readFileSync(`${__dirname}/package-lock.json`)).digest('hex'),
    node: process.version, platform: process.platform,
    engine: require('@screeps/engine/package.json').version,
    driver: require('@screeps/driver/package.json').version,
  };
}
async function sampleTick(server, bot) {
  const start = performance.now();
  await server.tick();
  const wallMilliseconds = performance.now() - start;
  const cpuMilliseconds = await bot.lastUsedCpu;
  if (typeof cpuMilliseconds !== 'number' || !Number.isFinite(cpuMilliseconds)) throw new Error('Missing engine CPU sample');
  const memory = await bot.memory;
  return { tick: Number(await server.world.gameTime), wallMilliseconds, cpuMilliseconds, memoryBytes: Buffer.byteLength(memory ?? '') };
}
module.exports = { provenance, sampleTick };
