import type { BoostAllocationRequest, AllocationLab, AllocationPoint } from '../../capabilities/industry/labs/boost-allocation';
import { allocateBoostLabs } from '../../capabilities/industry/labs/boost-allocation';
import type { LabConfig } from '../../config/labs';
import { validBoostRoles } from '../../config/lab-boost-roles';
export interface LabAllocationRoom { labs: readonly AllocationLab[]; anchor: AllocationPoint | null }
export interface LabAllocationPorts {
  room(home: string): LabAllocationRoom | null;
  settings(home: string): Partial<LabConfig>;
  supported(resource: string): boolean;
}
function requestShape(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => ['resource','mineral','energy'].includes(key));
}
function validateRequests(requests: readonly BoostAllocationRequest[]): void {
  if (!Array.isArray(requests) || requests.length > 10 || !requests.every(requestShape) || !validBoostRoles(requests.map((request,index) => ({ ...request,lab: 'allocation-'+index })))) throw new Error('Invalid requested boost buffers');
}
interface AllocationOptions { preserveReactions?: boolean }
function validateOptions(options: AllocationOptions): void {
  if (!options || typeof options !== 'object' || Array.isArray(options) || !Object.keys(options).every(key => key === 'preserveReactions')) throw new Error('Unknown boost allocation option');
  if (options.preserveReactions !== undefined && typeof options.preserveReactions !== 'boolean') throw new Error('Invalid reaction preservation');
}
function reactionPolicy(settings: Partial<LabConfig>,options: AllocationOptions): boolean { return options.preserveReactions ?? settings.labReactionsEnabled ?? false; }
function propose(room: LabAllocationRoom,settings: Partial<LabConfig>,requests: readonly BoostAllocationRequest[],options: AllocationOptions) {
  if (requests.length && !room.anchor) return { ok: false as const,reason: 'spawn-unavailable' as const };
  const excluded = new Set(settings.labReservedIds ?? []), preserveReactions = reactionPolicy(settings,options);
  const plan = allocateBoostLabs(room.labs.filter(lab => !excluded.has(lab.id)),requests,room.anchor ?? { x: 25,y: 25 },preserveReactions);
  return plan ? { ok: true as const,plan,preserveReactions } : { ok: false as const,reason: 'insufficient-compatible-labs' as const };
}
export function createLabAllocationOperator(ports: LabAllocationPorts) {
  return (home: string,requests: readonly BoostAllocationRequest[],options: AllocationOptions = {}) => {
    validateRequests(requests); validateOptions(options);
    if (requests.some(request => !ports.supported(request.resource))) throw new Error('Unsupported boost compound');
    const room = ports.room(home); if (!room) throw new Error('Visible owned room is required');
    return propose(room,ports.settings(home),requests,options);
  };
}

export type LabAllocationPreview = ReturnType<ReturnType<typeof createLabAllocationOperator>>;
export type LabAllocationOperation = ReturnType<typeof createLabAllocationOperator>;
export function validateBoostAllocationInput(requests: readonly BoostAllocationRequest[],options: AllocationOptions): void { validateRequests(requests); validateOptions(options); }
