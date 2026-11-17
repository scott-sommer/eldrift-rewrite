import { createResidualNetwork } from './residual-network';
import type { CapacityEdge } from './residual-network';
export interface FlowCheckpoint { version: 1; signature: string; augmentations: number }
/** Rebuild validated residual state by bounded deterministic replay; no persisted capacities are trusted. */
export function createRecoverableFlow(
  size: number, edges: readonly CapacityEdge[], source: number, sink: number, saved?: FlowCheckpoint,
) {
  const signature = JSON.stringify(['recoverable-flow-v2', size, edges.map(edge => [edge.from, edge.to, edge.capacity]), source, sink]);
  validateCheckpoint(saved, signature);
  const network = createResidualNetwork(size, edges, source, sink);
  return new FlowRunner(network, signature, checkpointCount(saved));
}
class FlowRunner {
  private completed = 0;
  constructor(private network: ReturnType<typeof createResidualNetwork>, private signature: string, private target: number) {}
  advance(maximumAugmentations: number, guard: () => boolean = () => true, maximumScans = Number.MAX_SAFE_INTEGER) {
    const replaying = this.completed < this.target;
    const allowance = Math.min(maximumAugmentations, replayAllowance(replaying, this.target - this.completed));
    const result = this.network.advance(allowance, guard, maximumScans);
    this.completed += result.augmentations;
    validateReplay(result.done, this.completed, this.target);
    this.target = Math.max(this.target, this.completed);
    return { ...result, replaying: isReplaying(replaying, result.done),
      checkpoint: { version: 1 as const, signature: this.signature, augmentations: this.target } };
  }
}
function validateCheckpoint(saved: FlowCheckpoint | undefined, signature: string): void {
  if (!saved) return;
  if (saved.version !== 1 || saved.signature !== signature) throw new Error('Stale flow checkpoint');
  if (!Number.isSafeInteger(saved.augmentations) || saved.augmentations < 0 || saved.augmentations > 1000000) {
    throw new Error('Invalid flow checkpoint');
  }
}

function checkpointCount(saved?: FlowCheckpoint): number { return saved?.augmentations ?? 0; }
function validateReplay(done: boolean, completed: number, target: number): void {
  if (done && completed < target) throw new Error('Unreachable flow checkpoint');
}

function replayAllowance(replaying: boolean, remaining: number): number { return replaying ? remaining : Number.MAX_SAFE_INTEGER; }
function isReplaying(replaying: boolean, done: boolean): boolean { return replaying && !done; }

