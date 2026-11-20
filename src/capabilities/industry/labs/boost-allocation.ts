export interface AllocationPoint { x: number; y: number }
export interface AllocationLab extends AllocationPoint { id: string }
export interface BoostAllocationRequest { resource: string; mineral: number; energy: number }
export interface AllocatedBoostRole extends BoostAllocationRequest { lab: string }
export interface BoostLabAllocation { roles: AllocatedBoostRole[]; inputs: string[]; outputs: string[]; distance: number }
export function allocationRange(a: AllocationPoint,b: AllocationPoint): number { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }
function point(value: AllocationPoint): boolean { return [value.x,value.y].every(axis => Number.isSafeInteger(axis) && axis >= 0 && axis <= 49); }
function validate(labs: readonly AllocationLab[],requests: readonly BoostAllocationRequest[],anchor: AllocationPoint): void {
  if (labs.length > 10 || requests.length > 10 || !point(anchor)) throw new Error('Invalid boost allocation bounds');
  if (new Set(labs.map(lab => lab.id)).size !== labs.length || !labs.every(lab => lab.id.length > 0 && point(lab))) throw new Error('Invalid boost allocation roster');
}
function byRange(anchor: AllocationPoint) { return (a: AllocationLab,b: AllocationLab) => allocationRange(a,anchor)-allocationRange(b,anchor) || a.id.localeCompare(b.id); }
function proposal(selected: readonly AllocationLab[],requests: readonly BoostAllocationRequest[],anchor: AllocationPoint,inputs: readonly AllocationLab[],outputs: readonly AllocationLab[]): BoostLabAllocation {
  const ordered = [...selected].sort(byRange(anchor));
  return { roles: requests.map((request,index) => ({ ...request,lab: ordered[index]!.id })),inputs: inputs.map(lab => lab.id),outputs: outputs.map(lab => lab.id),
    distance: ordered.reduce((sum,lab) => sum+allocationRange(lab,anchor),0) };
}
function candidate(labs: readonly AllocationLab[],requests: readonly BoostAllocationRequest[],anchor: AllocationPoint,first: AllocationLab,second: AllocationLab): BoostLabAllocation | null {
  const available = labs.filter(lab => lab.id !== first.id && lab.id !== second.id);
  const outputs = available.filter(lab => allocationRange(lab,first) <= 2 && allocationRange(lab,second) <= 2);
  const outputIds = new Set(outputs.map(lab => lab.id));
  available.sort((a,b) => Number(outputIds.has(a.id))-Number(outputIds.has(b.id)) || byRange(anchor)(a,b));
  const selected = available.slice(0,requests.length), chosen = new Set(selected.map(lab => lab.id));
  const remaining = outputs.filter(lab => !chosen.has(lab.id));
  return selected.length === requests.length && remaining.length > 0 ? proposal(selected,requests,anchor,[first,second],remaining) : null;
}
function better(a: BoostLabAllocation,b: BoostLabAllocation): boolean {
  if (a.outputs.length !== b.outputs.length) return a.outputs.length > b.outputs.length;
  if (a.distance !== b.distance) return a.distance < b.distance;
  return JSON.stringify([a.roles.map(role => role.lab),a.inputs]) < JSON.stringify([b.roles.map(role => role.lab),b.inputs]);
}
/** At most 45 input pairs; preserve reaction capacity, then minimize total boost travel range. */
export function allocateBoostLabs(labs: readonly AllocationLab[],requests: readonly BoostAllocationRequest[],anchor: AllocationPoint,preserveReactions: boolean): BoostLabAllocation | null {
  validate(labs,requests,anchor);
  if (requests.length > labs.length) return null;
  if (!requests.length) return { roles: [],inputs: [],outputs: [],distance: 0 };
  if (!preserveReactions) return proposal([...labs].sort(byRange(anchor)).slice(0,requests.length),requests,anchor,[],[]);
  const ordered = [...labs].sort((a,b) => a.id.localeCompare(b.id)); let best: BoostLabAllocation | null = null;
  for (let first = 0; first < ordered.length; first++) for (let second = first+1; second < ordered.length; second++) {
    const next = candidate(ordered,requests,anchor,ordered[first]!,ordered[second]!);
    if (next && (!best || better(next,best))) best = next;
  }
  return best;
}
