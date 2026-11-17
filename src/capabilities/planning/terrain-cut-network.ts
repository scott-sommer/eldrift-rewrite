import { compactSequence } from './draft-revision';
import { adjacentTiles, tileAt, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import { createRecoverableFlow } from '../../core/recoverable-flow';
import type { FlowCheckpoint } from '../../core/recoverable-flow';
import type { CapacityEdge } from '../../core/residual-network';
export interface TerrainCutInput {
  walkable: readonly boolean[]; barrierCosts: readonly (number | null)[];
  entries: readonly Tile[]; protectedTiles: readonly Tile[];
}
/** Original vertex-split reduction: null costs forbid barriers; diagonal edges model attacker movement. */
export function createTerrainCutNetwork(input: TerrainCutInput, checkpoint?: FlowCheckpoint) {
  const infinity = validateInput(input);
  const saved = checkpoint && { ...checkpoint };
  input = { walkable: [...input.walkable], barrierCosts: [...input.barrierCosts],
    entries: input.entries.map(tile => ({ ...tile })), protectedTiles: input.protectedTiles.map(tile => ({ ...tile })) };
  const recipe = terrainGraphRecipe(input);
  const entries = new Set(input.entries.map(tileIndex)), protectedTiles = new Set(input.protectedTiles.map(tileIndex));
  const prepare = prepareEdges(buildEdges(input, entries, protectedTiles, infinity));
  let network: ReturnType<typeof createRecoverableFlow> | undefined;
  return { advance(maximumAugmentations: number, guard: () => boolean = () => true, maximumScans = Number.MAX_SAFE_INTEGER) {
    const prepared = prepare(maximumScans, guard);
    if (!prepared.done) return { status: 'pending' as const, flow: 0, ...(saved ? { checkpoint: { ...saved } } : {}) };
    network ??= createRecoverableFlow(5002, prepared.edges, 5000, 5001, saved, recipe);
    const result = network.advance(maximumAugmentations, guard, maximumScans - prepared.scans);
    if (!result.done) return { status: 'pending' as const, flow: result.flow, checkpoint: result.checkpoint };
    if (result.flow >= infinity) return { status: 'rejected' as const, reason: 'no-legal-cut' as const };
    const reached = new Set(result.reachable);
    const barriers = input.walkable.flatMap((open, index) =>
      open && reached.has(index * 2) && !reached.has(index * 2 + 1) ? [tileAt(index)] : []);
    return { status: 'complete' as const, cost: result.flow, barriers };
  } };
}
function* buildEdges(input: TerrainCutInput, entries: Set<number>, protectedTiles: Set<number>, infinity: number): Generator<CapacityEdge> {
  for (let index = 0; index < 2500; index++) {
    if (!input.walkable[index]) continue;
    const terminal = [entries, protectedTiles].some(set => set.has(index));
    const cost = terminal ? infinity : input.barrierCosts[index] ?? infinity;
    yield { from: index * 2, to: index * 2 + 1, capacity: cost };
    if (entries.has(index)) yield { from: 5000, to: index * 2, capacity: infinity };
    if (protectedTiles.has(index)) yield { from: index * 2 + 1, to: 5001, capacity: infinity };
    for (const tile of adjacentTiles(tileAt(index))) {
      const target = tileIndex(tile);
      if (input.walkable[target]) yield { from: index * 2 + 1, to: target * 2, capacity: infinity };
    }
  }
}
function validateInput(input: TerrainCutInput): number {
  if (input.walkable.length !== 2500 || input.barrierCosts.length !== 2500) throw new Error('Invalid cut grid');
  if (!Array.from(input.walkable).every(value => typeof value === 'boolean')) throw new Error('Invalid cut walkability');
  const infinity = capacityLimit(input.barrierCosts);
  for (const tile of [...input.entries, ...input.protectedTiles]) {
    if (!input.walkable[tileIndex(tile)]) throw new Error('Blocked cut terminal');
  }
  if (!input.protectedTiles.length) throw new Error('Missing cut protected tiles');
  return infinity;
}

function capacityLimit(costs: readonly (number | null)[]): number {
  let sum = 0;
  for (const cost of costs) {
    if (cost === null) continue;
    if (!Number.isSafeInteger(cost) || cost < 1) throw new Error('Invalid cut cost');
    sum += cost;
  }
  if (!Number.isSafeInteger(sum + 1)) throw new Error('Cut capacity overflow');
  return sum + 1;
}

function prepareEdges(iterator: Generator<CapacityEdge>) {
  const edges: CapacityEdge[] = [];
  let done = false;
  return (maximum: number, guard: () => boolean) => {
    if (!Number.isSafeInteger(maximum) || maximum < 0) throw new Error('Invalid flow scan budget');
    let scans = 0;
    while (!done && scans < maximum && guard()) {
      const step = iterator.next(); scans++;
      if (step.done) done = true;
      else edges.push(step.value);
    }
    return { edges, done, scans };
  };
}

function terrainGraphRecipe(input: TerrainCutInput): string {
  return JSON.stringify(['terrain-graph-v1:row-major-eight-neighbour', input.walkable.map(value => Number(value)).join(''),
    compactSequence(input.barrierCosts.map(value => value ?? 0)),
    input.entries.map(tileIndex), input.protectedTiles.map(tileIndex)]);
}
