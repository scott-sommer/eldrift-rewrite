import { expect, test } from 'vitest';
import { createStartupProject } from '../../src/capabilities/economy/startup/project';
import { extendStartupReplacements } from '../../src/capabilities/economy/startup/replacements';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { StartupDeliveryInput } from '../../src/capabilities/economy/startup/delivery-model';
function input() {
  const view = startupDeliveryInput(); view.project.spawning.cash.horizon = 4000;
  view.project.source.energy = 1000; view.project.source.capacity = 1000;
  view.project.spawning.cash.homeEnergy = 3000; view.project.spawning.funding.initialEnergy = 3000; view.project.spawning.funding.capacity = 3000;
  return view;
}
function completed(view: StartupDeliveryInput) { const project = createStartupProject(view); project.advance(view.project.spawning.cash.horizon+1); return project; }
test('next request is funded normally and miner service begins exactly after the paid predecessor retires',() => {
  let view = input(); const initial = completed(view), before = JSON.stringify(initial.checkpoint());
  const first = extendStartupReplacements(view,initial.checkpoint()); expect(first.status).toBe('extended'); if (first.status !== 'extended') return;
  expect(first.kind).toBe('miner'); expect(first.request).toBe('miner:next');
  const parent = initial.result().spawning.births.find(birth => birth.request === first.parent)!;
  const replacement = first.input.project.spawning.requests.find(request => request.id === first.request)!;
  expect(replacement.readyAt+replacement.body.length*3).toBe(parent.activeAt+1499-10);
  const next = completed(first.input).result(), birth = next.spawning.births.find(birth => birth.request === first.request)!;
  expect(birth.cost).toBe(200); expect(next.cash.birthEnergy).toBe(500); expect(birth.activeAt).toBe(parent.activeAt+1499-10);
  expect(JSON.stringify(initial.checkpoint())).toBe(before); expect(view.project.spawning.requests).toHaveLength(2);
  view = first.input; const second = extendStartupReplacements(view,completed(view).checkpoint());
  expect(second.status).toBe('extended'); if (second.status !== 'extended') return;
  expect(second.kind).toBe('courier'); expect(second.request).toBe('courier:next'); expect(completed(second.input).result().cash.birthEnergy).toBe(600);
});
test('repeated finite extensions retain a nonoverlapping miner timeline and charge all bodies once',() => {
  let view = input(), additions = 0;
  for (let step = 0; step < 10; step++) {
    const result = extendStartupReplacements(view,completed(view).checkpoint());
    if (result.status === 'complete') break;
    expect(result.status).toBe('extended'); if (result.status !== 'extended') break;
    view = result.input; additions++;
  }
  expect(additions).toBe(4); const result = completed(view).result();
  expect(result.spawning.births).toHaveLength(6); expect(result.cash.birthEnergy).toBe(900);
  expect(result.delivery.deliveredEnergy).toBeGreaterThan(1000);
});
test('bank cash cannot bypass unavailable spawn funding for a replacement',() => {
  const view = input(); view.project.spawning.funding.initialEnergy = 300;
  const proposal = extendStartupReplacements(view,completed(view).checkpoint()); if (proposal.status !== 'extended') throw new Error('Expected proposal');
  const project = completed(proposal.input); expect(project.result().spawning.births).toHaveLength(2);
  expect(project.result().spawning.unscheduled.some(item => item.request === proposal.request)).toBe(true);
  expect(extendStartupReplacements(proposal.input,project.checkpoint())).toEqual({ status: 'deferred',reason: 'unfunded-service' });
});
test('checkpoint identity/completion fences prevent using another input or unfinished birth history',() => {
  const view = input(), project = createStartupProject(view); project.advance(50);
  expect(extendStartupReplacements(view,project.checkpoint())).toEqual({ status: 'deferred',reason: 'incomplete' });
  project.advance(3951); view.project.source.energy--;
  expect(() => extendStartupReplacements(view,project.checkpoint())).toThrow();
});
test('a short horizon does not manufacture additional bodies beyond its service window',() => {
  const view = input(); view.project.spawning.cash.horizon = 100;
  expect(extendStartupReplacements(view,completed(view).checkpoint())).toEqual({ status: 'complete' });
});

test('an unrelated queued identity cannot silently impersonate the source successor',() => {
  const view = input(), parent = view.project.spawning.requests[0]!;
  view.project.spawning.requests = [...view.project.spawning.requests,{ ...parent,id: 'miner:next',name: 'household',priority: 9 }];
  expect(extendStartupReplacements(view,completed(view).checkpoint())).toEqual({ status: 'deferred',reason: 'identity-conflict' });
});
test('an existing live name prevents planning a colliding successor without altering its predecessor',() => {
  const view = input(); view.project.spawning.liveNames = new Set(['miner:next']);
  expect(extendStartupReplacements(view,completed(view).checkpoint())).toEqual({ status: 'deferred',reason: 'identity-conflict' });
  expect(view.project.spawning.requests).toHaveLength(2);
});
