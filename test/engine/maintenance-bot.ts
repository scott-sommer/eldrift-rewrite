import { loop as productionLoop } from '../../src/main';
interface Evidence { remaining: string[][]; start: number }
declare global { interface Memory { maintenanceEvidence?: Evidence } }
export function loop(): void {
  if (!Memory.maintenanceEvidence) {
    Memory.maintenanceEvidence = { start: Game.time, remaining: [] };
    Memory.eldrift = { format: 1, records: {
      'reservations/empire': { owner: 'reservations', version: 1, data: { claims: [
        { resource: 'short', holder: 'one', scope: 'mine', expiresAt: Game.time + 1 },
        { resource: 'long', holder: 'two', scope: 'haul', expiresAt: Game.time + 10 },
      ] } },
    } };
  }
  productionLoop();
  const root = Memory.eldrift as { records: Record<string, { data: { claims: { resource: string }[] } }> };
  Memory.maintenanceEvidence.remaining.push(root.records['reservations/empire']!.data.claims.map(c => c.resource));
}
