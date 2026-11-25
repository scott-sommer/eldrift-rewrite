import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { planForecastReset, applyForecastReset } from './forecast-reset.mjs';
const git = (...args) => execFileSync('git',args,{ encoding: 'utf8',maxBuffer: 16*1024*1024 });
const hash = data => createHash('sha256').update(data).digest('hex');
async function historicalModule(revision) {
  const files = new Map(), tree = new Set(git('ls-tree','-r','--name-only',revision).trim().split('\n'));
  const plugin = { name: 'committed-source',setup(api) {
    api.onResolve({ filter: /.*/ },args => {
      const base = posix.normalize(posix.join(posix.dirname(args.importer || 'tools/memory/entry.ts'),args.path));
      const path = [base,base+'.ts',base+'/index.ts'].find(candidate => tree.has(candidate));
      if (!path) throw new Error('Unresolved historical module '+base);
      return { path,namespace: 'git' };
    });
    api.onLoad({ filter: /.*/,namespace: 'git' },args => {
      const contents = git('show',revision+':'+args.path); files.set(args.path,contents); return { contents,loader: 'ts' };
    });
  } };
  const result = await build({ stdin: { contents: readFileSync('tools/memory/forecast-rehearsal-entry.ts','utf8'),sourcefile: 'tools/memory/entry.ts',loader: 'ts' },plugins: [plugin],bundle: true,write: false,format: 'cjs',platform: 'node',target: 'es2022',logLevel: 'silent' });
  const code = result.outputFiles[0].text, module = { exports: {} };
  new Function('module','exports','require',code)(module,module.exports,createRequire(import.meta.url));
  return { api: module.exports,bundleSha256: hash(code),sourceFiles: files.size };
}
const [oldRef = 'ee26176',output = 'artifacts/forecast-upgrade'] = process.argv.slice(2);
const oldSource = git('rev-parse',oldRef+'^{commit}').trim(), currentSource = git('rev-parse','HEAD').trim();
const old = await historicalModule(oldSource), current = await historicalModule(currentSource);
const root = old.api.seed(), original = JSON.stringify(root), before = old.api.inspect(root);
assert.deepEqual(current.api.inspect(root),before); assert.equal(JSON.stringify(root),original);
const oldBranch = JSON.parse(original), expected = old.api.resume(oldBranch), result = current.api.resume(root);
assert.deepEqual(result,expected); assert.throws(() => old.api.inspect(root),/future/);
const upgraded = JSON.stringify(root), plan = planForecastReset(upgraded,['W0N1','W1N1']), reset = applyForecastReset(upgraded,plan);
assert.equal(plan.entries.length,4); assert.doesNotThrow(() => old.api.inspect(JSON.parse(reset)));
const restarted = old.api.seed(JSON.parse(reset)); assert.deepEqual(old.api.inspect(restarted),before);
const report = { oldSource,currentSource,entrySha256: hash(readFileSync('tools/memory/forecast-rehearsal-entry.ts')),oldRestartedFromReset: true,oldBundleSha256: old.bundleSha256,currentBundleSha256: current.bundleSha256,oldSourceFiles: old.sourceFiles,currentSourceFiles: current.sourceFiles,readOnlyMigration: true,resumedResultsEqual: true,oldReaderRefusedUpgrade: true,oldReaderAcceptedReset: true,scope: 'Host execution of actual committed owner modules; no native world rollback',files: [] };
mkdirSync(output,{ recursive: true });
for (const [name,data] of [['old.json',original],['upgraded.json',upgraded],['reset-plan.json',JSON.stringify(plan)],['reset.json',reset]]) {
  const file = resolve(output,name); writeFileSync(file,data,{ flag: 'wx' }); report.files.push({ name,sha256: hash(data) });
}
writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n',{ flag: 'wx' });
console.log(JSON.stringify(report));
