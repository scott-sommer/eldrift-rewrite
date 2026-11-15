import { createNativePlanningAdmission } from '../../src/app/native-planning-admission';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { resolveConfig } from '../../src/config/resolve';
import type { PlanningConstraint } from '../../src/capabilities/planning/assessment-model';
const admit = createNativePlanningAdmission(createMemoryPort(() => Memory), ['spawn', 'storage'], 'native-admission-v1');
export function verifyNativePlanningAdmission(constraints: readonly PlanningConstraint[]): void {
  const config = resolveConfig({ roomOverride: { planningEnabled: true } }, Game.time).values;
  if (admit('E9S9', config).status !== 'unavailable') throw new Error('Hidden room admitted');
  if (admit('W0N1', { ...config, planningEnabled: false }).status !== 'unavailable') throw new Error('Disabled planning admitted');
  const result = admit('W0N1', config, constraints);
  if (result.status !== 'ready') throw new Error('Owned room not admitted: ' + result.status);
  if (!result.request.observation.objects.some(item => item.kind === 'controller')) throw new Error('Missing native controller');
  if (!result.request.observation.constraints.some(item => item.kind === 'locked' && item.type === 'spawn')) throw new Error('Missing preservation lock');
  if (result.baseRevision !== 0) throw new Error('Changed baseline');
  const memory = Memory as Memory & { planningAdmissionRows?: unknown[] };
  (memory.planningAdmissionRows ??= []).push({ tick: Game.time, reused: result.reused,
    revision: result.stores.requests.read().revision, baseRevision: result.baseRevision });
}
