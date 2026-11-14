import { loop as productionLoop } from '../../src/main';
interface RetirementEvidence { counts: number[]; requested: number }
declare global { interface Memory { retirementEvidence?: RetirementEvidence } }
export function loop(): void {
  const creep = Game.creeps['action-worker'];
  if (!Memory.retirementEvidence) {
    Memory.retirementEvidence = { counts: [], requested: -1 };
    Memory.eldrift = { format: 1, records: {
      'tasks/action-worker': { owner: 'tasks', version: 2, data: { unit: 'action-worker', queue: [] } },
      'reservations/empire': { owner: 'reservations', version: 1, data: { claims: [
        { resource: 'slot', holder: 'action-worker', scope: 'work', expiresAt: Game.time + 100 },
        { resource: 'other', holder: 'unrelated', scope: 'mission', expiresAt: Game.time + 100 },
      ] } },
    } };
  }
  productionLoop();
  if (creep && Memory.retirementEvidence.requested === -1) Memory.retirementEvidence.requested = creep.suicide();
  const root = Memory.eldrift as { records: Record<string, { data: { claims: unknown[] } }> };
  Memory.retirementEvidence.counts.push(root.records['reservations/empire']!.data.claims.length);
}
