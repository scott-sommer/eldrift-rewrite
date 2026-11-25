import { expect, test } from 'vitest';
import { proposeStartupLaborDemand } from '../../src/features/work/startup-demand';
import { workOwner } from '../../src/features/work/identity';
import type { StartupLaborDemand } from '../../src/features/work/startup-demand-model';
import type { PopulationUnit } from '../../src/capabilities/spawning/demand';
function plan(): StartupLaborDemand {
  return { home: 'W0N1',mode: 'builder',enabled: true,level: 4,budget: 200,recipe: 'balanced',maximumParts: 3,maximumUnits: 2,id: 'quote-worker',placement: { spawn: 'spawn',exit: { room: 'W0N1',x: 14,y: 15 } },horizon: 100,observedAt: 5000,replacementTravel: 5,replacementMargin: 2 };
}
function unit(ttl = 100): PopulationUnit { return { name: 'existing',owner: workOwner('W0N1','builder'),room: 'W0N1',spawning: false,ticksToLive: ttl }; }
function proposed(p = plan()) { const result = proposeStartupLaborDemand(p,[],[]); if (result.status !== 'proposed') throw new Error(result.reason); return result; }
test('missing worker uses a bounded shared recipe and relative forecast clocks without mutating configuration',() => {
  const p = plan(), before = JSON.stringify(p), result = proposed(p);
  expect(result).toMatchObject({ cost: 200,spawnTicks: 9,request: { owner: 'work:W0N1:builder',readyAt: 0,expiresAt: 101,body: ['work','carry','move'] } });
  result.request.placement!.exit.x = 2; expect(JSON.stringify(p)).toBe(before);
  const standard = { ...p,recipe: 'standard' as const,budget: 250,maximumParts: 4 }; expect(proposed(standard).cost).toBe(250);
});
test('healthy, spawning and legacy unscoped workers cover demand while unrelated homes do not',() => {
  const p = plan();
  for (const live of [unit(),{ ...unit(0),spawning: true },{ ...unit(),owner: workOwner(p.home) }]) expect(proposeStartupLaborDemand(p,[live],[])).toMatchObject({ reason: 'covered' });
  expect(proposeStartupLaborDemand(p,[{ ...unit(),room: 'W1N1',owner: workOwner('W1N1','builder') }],[]).status).toBe('proposed');
});
test('replacement timing reuses shared demand while all physical home workers enforce the ceiling',() => {
  const p = plan(); expect(proposeStartupLaborDemand(p,[unit(16)],[]).status).toBe('proposed');
  expect(proposeStartupLaborDemand({ ...p,maximumUnits: 1 },[unit(16)],[])).toMatchObject({ reason: 'workforce-limit' });
  const other = { ...unit(),owner: workOwner(p.home,'fortifier') };
  expect(proposeStartupLaborDemand({ ...p,maximumUnits: 1 },[other],[])).toMatchObject({ reason: 'workforce-limit' });
});
test('native queue expiry and unscoped ownership prevent duplicate workers without modifying requests',() => {
  const p = plan(), request = proposed().request; request.owner = workOwner(p.home); request.readyAt = 5000; request.expiresAt = 5100;
  expect(proposeStartupLaborDemand(p,[],[{ ...request,room: 'W1N1',home: p.home }])).toMatchObject({ reason: 'covered' });
  const before = JSON.stringify(request); expect(proposeStartupLaborDemand(p,[],[request])).toMatchObject({ reason: 'covered' }); expect(JSON.stringify(request)).toBe(before);
  expect(proposeStartupLaborDemand(p,[],[{ ...request,expiresAt: 5000 }])).toMatchObject({ reason: 'identity-conflict' });
});
test('disabled, body, part and workforce limits defer rather than inventing a funded body',() => {
  expect(proposeStartupLaborDemand({ ...plan(),enabled: false },[],[])).toMatchObject({ reason: 'disabled' });
  expect(proposeStartupLaborDemand({ ...plan(),budget: 199 },[],[])).toMatchObject({ reason: 'body-budget' });
  expect(proposeStartupLaborDemand({ ...plan(),recipe: 'standard',budget: 250 },[],[])).toMatchObject({ reason: 'body-budget' });
  expect(proposeStartupLaborDemand({ ...plan(),maximumUnits: 0 },[],[])).toMatchObject({ reason: 'workforce-limit' });
  expect(() => proposeStartupLaborDemand({ ...plan(),maximumParts: 51 },[],[])).toThrow('limits');
});
