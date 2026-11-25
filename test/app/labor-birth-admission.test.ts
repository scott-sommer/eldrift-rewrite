import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import { expect, test } from 'vitest';
import { createLaborBirthAdmission } from '../../src/app/labor-birth-admission';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { materializeLaborBirth } from '../../src/features/work/labor-birth';
import { copySpawnRequest } from '../../src/capabilities/spawning/placement';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { openState } from '../../src/persistence/versioned-state';
import { spawnQueueSchema } from '../../src/features/population/spawn-schema';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
function fixture() {
  const f = laborProposalFixture(), proposal = f.propose(f.input); if (proposal.status !== 'ready') throw new Error('Expected proposal');
  const snapshot = proposal.read(), materialized = materializeLaborBirth(snapshot,1); if (materialized.status !== 'ready') throw new Error('Expected birth');
  let root = {},tick = 1,current = true;
  const state = createMemoryPort(() => root), staging = createLaborTaskStaging(state);
  staging.stage(snapshot,1,() => true);
  const admit = createLaborBirthAdmission(state,{ now: () => tick,current: () => current });
  return { state,staging,request: materialized.request as SpawnRequest,admit,root: () => JSON.stringify(root),at: (value: number) => { tick = value; },current: (value: boolean) => { current = value; },reload: () => { root = JSON.parse(JSON.stringify(root)); } };
}
test('guarded birth survives queue reset and requires its exact current task without mutations',() => {
  const f = fixture(); createSpawnQueue(f.state,'W0N1').submit(f.request); f.reload();
  const queued = createSpawnQueue(f.state,'W0N1').list()[0]!, before = f.root();
  expect(f.admit(queued)).toBe(true); expect(f.root()).toBe(before);
  f.current(false); expect(f.admit(queued)).toBe(false); f.current(true);
  f.staging.cancel('worker','worker'); expect(f.admit(queued)).toBe(false);
});
test('changed identity/body/placement, missing marker and missed frame refuse before payment',() => {
  const f = fixture();
  for (const edit of [(request: typeof f.request) => { request.owner = 'other'; },(request: typeof f.request) => { request.body = ['carry','move']; },(request: typeof f.request) => { request.placement!.exit.x++; },(request: typeof f.request) => { delete request.admission; }]) {
    const changed = copySpawnRequest(f.request); edit(changed as typeof f.request); expect(f.admit(changed)).toBe(false);
  }
  f.at(2); expect(f.admit(f.request)).toBe(false);
});
test('v3 ordinary queues migrate to4 but cannot smuggle guarded requests into legacy records',() => {
  const f = fixture(), ordinary = copySpawnRequest(f.request); delete ordinary.admission;
  f.state.write('spawning/W0N1',{ owner: 'population',version: 3,data: { requests: [ordinary] } });
  expect(openState(f.state,'spawning/W0N1',spawnQueueSchema('W0N1')).requests).toEqual([ordinary]);
  expect(f.state.read('spawning/W0N1')).toMatchObject({ version: 4 });
  expect(() => openState(f.state,'spawning/W0N1',{ ...spawnQueueSchema('W0N1'),version: 3 })).toThrow('unsupported future version');
  f.state.write('spawning/W0N1',{ owner: 'population',version: 3,data: { requests: [f.request] } });
  expect(() => openState(f.state,'spawning/W0N1',spawnQueueSchema('W0N1'))).toThrow('Invalid legacy spawn admission');
});
