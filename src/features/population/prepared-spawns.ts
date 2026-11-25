import { allocateSpawns } from '../../capabilities/spawning/allocate';
import { executeSpawnAssignment } from '../../capabilities/spawning/execute';
import type { SpawnExecutionPorts, SpawnReceipt } from '../../capabilities/spawning/execute';
import type { SpawnRequest, SpawnAssignment, UnaffordablePolicy } from '../../capabilities/spawning/request';
import type { SpawnObservation } from './spawn-coordinator';
export type SpawnPreparation = (assignment: SpawnAssignment) => number;
/** Caller seals the tick first. Every request is considered at most once; effects consume a slot even on uncertainty. */
export function executePreparedSpawns(requests: readonly SpawnRequest[], ports: SpawnExecutionPorts, observe: () => SpawnObservation,
  prepare: SpawnPreparation, defer: (ids: ReadonlySet<string>) => void, policy: UnaffordablePolicy): SpawnReceipt[] {
  let pending = [...requests]; const used = new Set<string>(), receipts: SpawnReceipt[] = [];
  while (pending.length) {
    const view = observe(), slots = view.slots.filter(slot => !used.has(slot.id));
    const assignment = allocateSpawns(pending,slots,view.energy,view.names,ports.clock(),policy)[0]; if (!assignment) break;
    pending = pending.filter(request => request.id !== assignment.request.id);
    defer(new Set([assignment.request.id]));
    const result = preparedAttempt(assignment,ports,prepare); receipts.push(result.receipt);
    if (result.attempted) used.add(assignment.spawn);
    if (!result.attempted && policy === 'wait') pending = pending.filter(request => request.room !== assignment.request.room);
  }
  return receipts;
}
function preparedAttempt(assignment: SpawnAssignment, ports: SpawnExecutionPorts, prepare: SpawnPreparation): { attempted: boolean; receipt: SpawnReceipt } {
  try {
    const code = prepare(assignment);
    if (code !== 0) return { attempted: false,receipt: { request: assignment.request.id,spawn: assignment.spawn,status: 'rejected',code } };
    return { attempted: true,receipt: executeSpawnAssignment(ports,assignment) };
  } catch (error) { return { attempted: true,receipt: { request: assignment.request.id,spawn: assignment.spawn,status: 'uncertain',error } }; }
}
