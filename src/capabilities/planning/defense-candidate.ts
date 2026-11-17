import { defenseProtectionReport } from './defense-protection-report';
import type { ProtectionDecision } from './defense-protection-report';
import { defenseEntryTiles } from './defense-separation';
import { barrierCost } from './barrier-cost';
import type { BarrierCostInput } from './barrier-cost';
import { defenseAccess } from './defense-access';
import { defenseOperations } from './defense-operations';
import type { DefenseOperationsInput } from './defense-operations';
import { placementFailures } from './placement-validation';
import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { PlacedTile } from './template';
export interface DefenseCandidateInput extends BarrierCostInput {
  protection?: { assets: readonly { id: string; position: Tile }[]; exemptions: readonly ProtectionDecision[] };
  placements: readonly PlacedTile[]; origins: readonly Tile[]; gates: readonly Tile[];
  blocksMovement(type: string): boolean; repairRange: number;
  operations: Omit<DefenseOperationsInput, 'barriers' | 'towers' | 'gates' | 'repairReachable' | 'friendlyReachable'>;
}
/** Shared hard checks and operational diagnostics; strategy selection owns weights and tolerances. */
export function evaluateDefenseCandidate(input: DefenseCandidateInput) {
  const conflicts = placementFailures([...input.placements, ...input.barriers], input.observation);
  if (conflicts.length) return { ok: false as const, phase: 'placement' as const, details: conflicts };
  const validation = barrierCost(input);
  if (!validation.ok) return { ok: false as const, phase: 'separation' as const, details: validation };
  const protection = protectionReport(input);
  if (protection && !protection.acceptable) return { ok: false as const, phase: 'protection' as const, details: protection };
  const access = defenseAccess(friendlyMask(input), input.origins, input.repairRange);
  const operations = defenseOperations({ ...input.operations, ...access,
    barriers: input.barriers, gates: input.gates,
    towers: input.placements.filter(entry => entry.type === 'tower').map(entry => entry.position) });
  return { ok: true as const, validation, operations, ...(protection ? { protection } : {}) };
}
function friendlyMask(input: DefenseCandidateInput): boolean[] {
  const mask = input.observation.terrain.map(cell => cell !== 'wall');
  for (const object of input.observation.objects) mask[tileIndex(object.position)] = false;
  for (const object of input.observation.infrastructure) {
    if (!object.walkable) mask[tileIndex(object.position)] = false;
  }
  for (const entry of [...input.placements, ...input.barriers]) {
    if (input.blocksMovement(entry.type)) mask[tileIndex(entry.position)] = false;
  }
  for (const constraint of input.observation.constraints) {
    if (constraint.kind !== 'locked') mask[tileIndex(constraint.position)] = false;
  }
  return mask;
}

function protectionReport(input: DefenseCandidateInput) {
  if (!input.protection) return undefined;
  return defenseProtectionReport({
    terrain: input.observation.terrain,
    entries: input.attackerEntries ?? defenseEntryTiles(input.observation.terrain),
    barriers: input.barriers.map(entry => entry.position), assets: input.protection.assets,
  }, input.protection.exemptions);
}
