import { peekState } from '../../src/persistence/versioned-state';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeWorkFeature } from '../../src/app/native-work';
import { resolveConfig } from '../../src/config/resolve';
import type { FeatureContext } from '../../src/app/runtime-model';
import type { NativeLaborProof } from './native-labor-model';
import type { LaborTaskPayload } from '../../src/features/work/labor-task';
/** Exercise the production worker room feature; financial phase deltas do not choose these actions. */
export function runNativeLaborTask(proof: NativeLaborProof, creep: Creep | undefined): void {
  const state = createMemoryPort(() => proof.stagedTask!.root), name = proof.proposal!.input.request.name;
  if (Game.time === 11) {
    const task = createLaborTaskStaging(state).read(name)?.queue[0], payload = task?.payload as LaborTaskPayload;
    if (task?.phase !== 'pickup' || payload.progress?.pending?.kind !== 'pickup') throw new Error('Expected restored pending pickup');
    proof.actorReloadAt = Game.time;
  }
  const dispatch = createNativeDispatch(state);
  const workers = createNativeWorkFeature(state,dispatch,{},() => false,{
    observeIntent: (_,action,energy,result) => { if (result.status === 'issued') proof.calls.push({ tick: Game.time,action,energy,code: result.code }); },
  });
  const home = proof.proposal!.input.request.room;
  workers.feature.run({ room: { name: home },config: resolveConfig({ empire: { workersEnabled: !proof.actorResult,workerSpawningEnabled: false,workerMode: 'builder' } },Game.time) } as FeatureContext);
  dispatch.flush();
  const receipt = creep?.memory.startupLaborReceipt;
  if (receipt?.completedAt === Game.time) { proof.actorReceipt = { ...receipt }; proof.actorResult = { tick: Game.time,worker: receipt.unit,picked: receipt.picked,spent: receipt.spent,returned: receipt.returned,pending: null }; }
  if ([10,11,12].includes(Game.time)) (proof.actorClaims ??= []).push({ tick: Game.time,allocations: (peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? []).flatMap(claim => claim.allocations) });

}
