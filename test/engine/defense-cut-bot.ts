import type { StagedTile } from '../../src/capabilities/planning/template';
import type { TerrainDefenseCheckpoint } from '../../src/features/planning/terrain-defense-request';
import { loop as runtimeLoop } from '../../src/main';
import { createTerrainDefenseRequest } from '../../src/features/planning/terrain-defense-request';
let search: ReturnType<typeof createTerrainDefenseRequest> | undefined;
export function loop() {
  runtimeLoop();
  const memory = Memory as Memory & { defenseCut?: { done: boolean; barriers: number; entries?: StagedTile[]; starts: number[]; restored: number[]; checkpoint?: TerrainDefenseCheckpoint; rows: { tick: number; cpu: number; status: string }[] } };
  const saved = memory.defenseCut ??= { done: false, barriers: 0, starts: [], restored: [], rows: [] };
  if (saved.done) return;
  const started = Game.cpu.getUsed();
  if (!search) { saved.starts.push(Game.time); saved.restored.push(saved.checkpoint?.flow?.augmentations ?? 0); search = createSearch(saved.checkpoint); }
  const step = search.advance(1, () => Game.cpu.getUsed() - started < 5, 10000);
  saved.checkpoint = step.checkpoint;
  const result = step.result;
  saved.rows.push({ tick: Game.time, cpu: Game.cpu.getUsed() - started, status: result.status });
  if (result.status === 'rejected') throw new Error('Native defense cut rejected: ' + result.reason);
  if (result.status === 'complete') { saved.done = true; saved.barriers = result.barriers.length; saved.entries = result.barriers; }
}
function createSearch(checkpoint?: TerrainDefenseCheckpoint) {
  const protectedTiles = [];
  for (let y = 20; y <= 30; y++) for (let x = 20; x <= 30; x++) protectedTiles.push({ x, y });
  return createTerrainDefenseRequest({
    observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] },
    protectedAssets: [{ type: 'storage', position: { x: 25, y: 25 } }],
    protectedTiles, rcl: 6, costs: { rampart: 1, constructedWall: 1 },
  }, checkpoint);
}
