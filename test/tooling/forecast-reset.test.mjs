import { expect, test } from 'vitest';
import { planForecastReset, applyForecastReset } from '../../tools/memory/forecast-reset.mjs';
function fixture() {
  const records = { 'spawnQueue/W0N1': { owner: 'spawning',version: 1,data: { queued: ['paid'] } },'remoteStartupPlanning/W1N1': { owner: 'remotes',version: 6,data: { otherHome: true } } };
  for (const [name,version] of [['remoteStartupPlanning',6],['remoteStartupSchedules',3],['remoteStartupCandidates',3]]) records[name+'/W0N1'] = { owner: 'remotes',version,data: { progress: 21 } };
  return { legacy: { sleep: 40 },creeps: { actor: { cargo: 100 } },eldrift: { format: 1,records } };
}
test('offline reset removes the three selected derived owners and preserves every other value and input bytes',() => {
  const original = fixture(), source = Buffer.from(JSON.stringify(original)), before = Buffer.from(source), plan = planForecastReset(source,['W0N1']);
  expect(plan.entries).toHaveLength(3); const output = JSON.parse(applyForecastReset(source,plan));
  const expected = fixture(); for (const entry of plan.entries) delete expected.eldrift.records[entry.key];
  expect(output).toEqual(expected); expect(source).toEqual(before); expect(original).toEqual(fixture());
});
test('changed snapshots and modified plans refuse without returning a partial result',() => {
  const source = JSON.stringify(fixture()), plan = planForecastReset(source,['W0N1']);
  expect(() => applyForecastReset(source+' ',plan)).toThrow('mismatch');
  plan.entries.push({ key: 'spawnQueue/W0N1',owner: 'spawning',version: 1 }); expect(() => applyForecastReset(source,plan)).toThrow('mismatch');
});
test.each(['owner','version'])('unexpected %s blocks the entire reset',field => {
  const memory = fixture(); memory.eldrift.records['remoteStartupCandidates/W0N1'][field] = field === 'owner' ? 'other' : 99;
  expect(() => planForecastReset(JSON.stringify(memory),['W0N1'])).toThrow('Unsupported forecast envelope');
});
test('empty selection is explicit; invalid home identifiers and roots refuse',() => {
  const source = JSON.stringify(fixture()); expect(planForecastReset(source,['W2N2']).entries).toEqual([]);
  expect(() => planForecastReset(source,['W0N1','W0N1'])).toThrow('homes');
  expect(() => planForecastReset(source,['../spawnQueue'])).toThrow('homes');
  expect(() => planForecastReset('{}',['W0N1'])).toThrow('root');
});
