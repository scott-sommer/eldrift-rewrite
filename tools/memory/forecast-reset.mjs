import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const versions = { remoteStartupPlanning: 7,remoteStartupSchedules: 4,remoteStartupCandidates: 4 };
const digest = source => createHash('sha256').update(source).digest('hex');
function snapshot(source) {
  if (Buffer.byteLength(source) > 10*1024*1024) throw new Error('Snapshot exceeds 10 MiB limit');
  const memory = JSON.parse(source), root = memory?.eldrift;
  if (!root || root.format !== 1 || !root.records || typeof root.records !== 'object' || Array.isArray(root.records)) throw new Error('Unsupported memory snapshot root');
  return memory;
}
function homesList(homes) {
  if (!Array.isArray(homes) || !homes.length || homes.length > 16 || new Set(homes).size !== homes.length || homes.some(home => typeof home !== 'string' || home.length > 32 || !/^[WE]\d+[NS]\d+$/.test(home))) throw new Error('Invalid reset homes');
  return [...homes].sort();
}
/** Offline derived-cache reset only; preserve the original bytes as the recoverable backup. */
export function planForecastReset(source, homes) {
  const memory = snapshot(source), selected = homesList(homes), records = memory.eldrift.records, entries = [];
  for (const home of selected) for (const [namespace,maximum] of Object.entries(versions)) {
    const key = namespace+'/'+home;
    if (!Object.hasOwn(records,key)) continue;
    const raw = records[key];
    if (!raw || raw.owner !== 'remotes' || !Number.isSafeInteger(raw.version) || raw.version < 1 || raw.version > maximum || !Object.hasOwn(raw,'data')) throw new Error('Unsupported forecast envelope: '+key);
    entries.push({ key,owner: raw.owner,version: raw.version });
  }
  return { format: 1,operation: 'reset-derived-startup-forecasts',sourceSha256: digest(source),homes: selected,entries };
}
export function applyForecastReset(source, plan) {
  const expected = planForecastReset(source,plan?.homes);
  if (JSON.stringify(plan) !== JSON.stringify(expected)) throw new Error('Reset plan mismatch: source changed or plan modified');
  const memory = snapshot(source);
  for (const entry of expected.entries) delete memory.eldrift.records[entry.key];
  return JSON.stringify(memory,null,2)+'\n';
}
function main(args) {
  const [operation,input,planPath,...rest] = args;
  if (!input || !planPath) throw new Error('Usage: plan <snapshot> <new-plan> <home...> | apply <snapshot> <plan> <new-output>');
  const source = readFileSync(input);
  if (operation === 'plan') {
    const plan = planForecastReset(source,rest); writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n',{ flag: 'wx' });
    console.log(JSON.stringify({ plan: planPath,records: plan.entries.length,sourceSha256: plan.sourceSha256 })); return;
  }
  if (operation !== 'apply' || rest.length !== 1) throw new Error('Invalid reset command');
  const output = applyForecastReset(source,JSON.parse(readFileSync(planPath,'utf8')));
  writeFileSync(rest[0],output,{ flag: 'wx' }); console.log(JSON.stringify({ output: rest[0],sha256: digest(output) }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
