import { copyPlain } from '../core/plain-data';
import type { LaborTaskPayload } from '../features/work/labor-task';
import type { LaborIntent } from '../features/work/labor-progress';
import type { TaskCheckpoint } from './task-runner';
/** An exception leaves the prepared record intact; reconstruction must observe before issuing again. */
export function issueLaborIntent(payload: LaborTaskPayload, intent: LaborIntent, issue: () => boolean, checkpoint?: TaskCheckpoint): void {
  const state = payload.progress!; state.pending = intent;
  const phase = intent.kind === 'return' ? state.failure ? 'recover-deposit' : 'deposit' : intent.kind === 'work' ? 'work' : 'pickup';
  checkpoint?.({ phase,payload: copyPlain(payload) });
  if (!issue()) state.pending = null;
}
