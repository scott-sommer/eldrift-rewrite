import { allocateSpawns } from '../../spawning/allocate';
import type { SpawnSlot, SpawnAssignment } from '../../spawning/request';
import type { StartupSpawnInput } from './spawn-model';
export interface StartupAdmissionFunding {
  available(): number;
  charge(assignment: SpawnAssignment): boolean;
}
/** Failed physical admission leaves the slot and budget available for the declared skip policy. */
export function admitStartupSpawns(input: StartupSpawnInput, slots: readonly SpawnSlot[], tick: number, funding: StartupAdmissionFunding): SpawnAssignment[] {
  if (!input.funding.energyLayout) return aggregate(input,slots,tick,funding);
  const available = [...slots], admitted: SpawnAssignment[] = [];
  const requests = [...input.requests].sort((a,b) => a.priority-b.priority || a.id.localeCompare(b.id));
  for (const request of requests) {
    const proposal = allocateSpawns([request],available,{ [input.room]: funding.available() },input.liveNames,tick,input.unaffordable)[0];
    if (proposal && funding.charge(proposal)) {
      admitted.push(proposal); available.splice(available.findIndex(slot => slot.id === proposal.spawn),1); continue;
    }
    if (input.unaffordable === 'wait' && blocks(input,request,available,tick)) break;
  }
  return admitted;
}
function blocks(input: StartupSpawnInput, request: StartupSpawnInput['requests'][number], slots: readonly SpawnSlot[], tick: number): boolean {
  return allocateSpawns([request],slots,{ [input.room]: Number.MAX_SAFE_INTEGER },input.liveNames,tick,'skip').length > 0;
}

function aggregate(input: StartupSpawnInput, slots: readonly SpawnSlot[], tick: number, funding: StartupAdmissionFunding): SpawnAssignment[] {
  const assignments = allocateSpawns(input.requests,slots,{ [input.room]: funding.available() },input.liveNames,tick,input.unaffordable);
  for (const assignment of assignments) {
    if (!funding.charge(assignment)) throw new Error('Aggregate startup funding refused its own budget');
  }
  return assignments;
}
