import { loop as runtimeLoop } from '../../src/main';
import { createTerrainCutDefense } from '../../src/capabilities/planning/terrain-cut-defense';
let search: ReturnType<typeof createTerrainCutDefense> | undefined;
export function loop() {
  runtimeLoop();
  const memory = Memory as Memory & { defenseCut?: { done: boolean; barriers: number; starts: number[]; rows: { tick: number; cpu: number; status: string }[] } };
  const saved = memory.defenseCut ??= { done: false, barriers: 0, starts: [], rows: [] };
  if (saved.done) return;
  const started = Game.cpu.getUsed();
  if (!search) { saved.starts.push(Game.time); search = createSearch(); }
  const result = search.advance(1, () => Game.cpu.getUsed() - started < 5, 10000);
  saved.rows.push({ tick: Game.time, cpu: Game.cpu.getUsed() - started, status: result.status });
  if (result.status === 'rejected') throw new Error('Native defense cut rejected: ' + result.reason);
  if (result.status === 'complete') { saved.done = true; saved.barriers = result.barriers.length; }
}
function createSearch() {
  const protectedTiles = [];
  for (let y = 20; y <= 30; y++) for (let x = 20; x <= 30; x++) protectedTiles.push({ x, y });
  return createTerrainCutDefense({
    observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] },
    protectedAssets: [{ type: 'storage', position: { x: 25, y: 25 } }],
    protectedTiles, rcl: 6, costs: { rampart: 1, constructedWall: 1 },
  });
}
