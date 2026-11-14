export interface RecoveryDestination { kind: string; owned: boolean; free: number }
/** Mineral cargo prefers terminal headroom; emergency fallback still accepts any remaining durable capacity. */
export function recoveryPriority(destination: RecoveryDestination, resource: string, terminalReserve: number): number | undefined {
  if (destination.free <= 0) return undefined;
  if (destination.kind === 'container') return 4;
  if (!destination.owned) return undefined;
  if (destination.kind === 'storage') return 0;
  if (destination.kind === 'terminal') return terminalPriority(destination.free, resource, terminalReserve);
  if (resource !== 'energy') return undefined;
  if (destination.kind === 'spawn') return 2;
  if (destination.kind === 'extension') return 3;
  return undefined;
}

function terminalPriority(free: number, resource: string, reserve: number): number {
  return resource !== 'energy' && free > reserve ? -1 : 1;
}
