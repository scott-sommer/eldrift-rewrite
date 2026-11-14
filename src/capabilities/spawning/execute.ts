import type { SpawnAssignment } from './request';
export type SpawnReceipt =
  | { request: string; spawn: string; status: 'accepted' | 'rejected'; code: number }
  | { request: string; spawn: string; status: 'uncertain'; error: unknown };
export interface SpawnExecutionPorts {
  clock(): number;
  invoke(assignment: SpawnAssignment): number;
}
/** One batch per tick. Seal before effects, including callbacks that throw or re-enter. */
export function createSpawnExecutor(ports: SpawnExecutionPorts) {
  let tick: number | undefined;
  let receipts: SpawnReceipt[] = [];
  return {
    execute(assignments: readonly SpawnAssignment[]): readonly SpawnReceipt[] {
      const now = ports.clock();
      if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid spawn execution tick');
      if (tick === now) return receipts;
      validateBatch(assignments);
      tick = now;
      receipts = [];
      for (const assignment of assignments) {
        const identity = { request: assignment.request.id, spawn: assignment.spawn };
        try {
          const code = ports.invoke(assignment);
          receipts.push({ ...identity, status: code === 0 ? 'accepted' : 'rejected', code });
        } catch (error) {
          receipts.push({ ...identity, status: 'uncertain', error });
        }
      }
      return receipts;
    },
  };
}
function validateBatch(assignments: readonly SpawnAssignment[]): void {
  const spawns = new Set<string>();
  const requests = new Set<string>();
  const names = new Set<string>();
  for (const assignment of assignments) {
    if (spawns.has(assignment.spawn) || requests.has(assignment.request.id) || names.has(assignment.request.name)) throw new Error('Duplicate spawn execution');
    spawns.add(assignment.spawn);
    requests.add(assignment.request.id);
    names.add(assignment.request.name);
  }
}
