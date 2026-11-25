import type { StatePort } from '../../src/persistence/versioned-state';
import type { LaborTaskPayload } from '../../src/features/work/labor-task';
import type { NativeLaborProof } from './native-labor-model';
const interruption = 'Deliberate native labor interruption';
export function interruptLabor(proof: NativeLaborProof, point: 'before' | 'after'): void {
  if (Game.time !== 10 || proof.fault !== point || proof.interruptedAt !== undefined) return;
  proof.interruptedAt = Game.time;
  throw new Error(interruption);
}
/** Flush the production envelope first, then interrupt before the SDK callback. */
export function interruptibleLaborState(base: StatePort, proof: NativeLaborProof): StatePort {
  return { read: key => base.read(key),write(key,value) {
    base.write(key,value);
    const data = value.data as { queue?: { payload?: LaborTaskPayload }[] };
    if (key.startsWith('tasks/') && data.queue?.[0]?.payload?.progress?.pending?.kind === 'pickup') interruptLabor(proof,'before');
  } };
}
export function reconstructInterruptedLabor(proof: NativeLaborProof, run: () => void): void {
  try { run(); }
  catch (error) {
    if (!(error instanceof Error) || error.message !== interruption) throw error;
    proof.reconstructedAt = Game.time;
    run();
  }
}
