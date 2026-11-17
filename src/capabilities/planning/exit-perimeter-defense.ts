import { tileAt, insideRoom } from '../../core/geometry/local-grid';
import { barrierCost } from './barrier-cost';
import type { BarrierCostInput } from './barrier-cost';
import type { StagedTile } from './template';
export interface ExitPerimeterInput extends Omit<BarrierCostInput, 'barriers'> {
  depth?: number; rcl: number;
}
/** Original room-edge envelope. Natural walls replace barrier cells; shared validation owns safety. */
export function exitPerimeterDefense(input: ExitPerimeterInput) {
  const depth = input.depth ?? 2;
  validatePolicy(depth, input.rcl);
  const barriers = generateEnvelope(input, depth);
  const validation = barrierCost({ ...input, barriers });
  if (!validation.ok) return { ok: false as const, strategy: 'exit-perimeter-v1', validation };
  return { ok: true as const, strategy: 'exit-perimeter-v1', barriers, validation };
}
function generateEnvelope(input: ExitPerimeterInput, depth: number): StagedTile[] {
  const barriers: StagedTile[] = [];
  for (let index = 0; index < 2500; index++) {
    const position = tileAt(index);
    if (!insideRoom(position, depth) || Math.min(position.x, position.y, 49 - position.x, 49 - position.y) !== depth) continue;
    if (input.observation.terrain[index] === 'wall') continue;
    barriers.push({ type: 'rampart', position, rcl: input.rcl, priority: 50, tag: 'exit-perimeter' });
  }
  return barriers;
}
function validatePolicy(depth: number, rcl: number): void {
  if (!Number.isSafeInteger(depth) || depth < 2 || depth > 24) throw new Error('Invalid exit perimeter depth');
  if (!Number.isSafeInteger(rcl) || rcl < 2 || rcl > 8) throw new Error('Invalid defense RCL');
}
