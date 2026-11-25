import { peekState } from '../../src/persistence/versioned-state';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { createLaborTaskBehavior } from '../../src/app/labor-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeLaborTaskPorts } from '../../src/app/native-labor/ports';
const arbiter = createActionArbiter(() => Game.time), dispatch = { arbiter,movement: createMovementService(arbiter) };
import type { NativeLaborProof } from './native-labor-model';
import type { LaborTaskPayload } from '../../src/features/work/labor-task';
/** Controlled SDK ports; financial phase deltas do not choose these actions. */
export function runNativeLaborTask(proof: NativeLaborProof, creep: Creep | undefined): void {
  const state = createMemoryPort(() => proof.stagedTask!.root), name = proof.proposal!.input.request.name;
  if (Game.time === 11) {
    const task = createLaborTaskStaging(state).read(name)?.queue[0], payload = task?.payload as LaborTaskPayload;
    if (task?.phase !== 'pickup' || payload.progress?.pending?.kind !== 'pickup') throw new Error('Expected restored pending pickup');
    proof.actorReloadAt = Game.time;
  }
  const ports = createNativeLaborTaskPorts(state,dispatch,{ enabled: () => true,
    observeIntent: (_,action,energy,result) => { if (result.status === 'issued') proof.calls.push({ tick: Game.time,action,energy,code: result.code }); },
    completed: (_,progress) => { proof.actorResult = { tick: Game.time,...progress }; },
  });
  const behavior = createLaborTaskBehavior(ports);
  const result = createTaskRunner(state,{ 'household-labor': behavior },() => Game.time)(name,creep!);
  dispatch.movement.flush();
  if ([10,11,12].includes(Game.time)) (proof.actorClaims ??= []).push({ tick: Game.time,allocations: (peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? []).flatMap(claim => claim.allocations) });
  if (result?.status === 'failed') throw new Error('Native labor task failed: '+result.reason);
}
