import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
interface ReactionControl { paused: boolean }
const key = 'industry-reaction-control/empire';
const schema: StateSchema<ReactionControl> = { owner: 'industry',version: 1,initial: () => ({ paused: false }),migrations: {},
  valid(value: unknown): value is ReactionControl {
    return !!value && typeof value === 'object' && Object.keys(value).length === 1 && typeof (value as ReactionControl).paused === 'boolean';
  } };
/** Global admission control is independent of room configuration precedence and boost service policy. */
export function reactionsPaused(state: StatePort): boolean { return peekState(state,key,schema)?.paused ?? false; }
export function createReactionControl(state: StatePort) {
  return {
    reactionsStatus() { return { paused: reactionsPaused(state) }; },
    setReactionsPaused(paused: boolean) {
      if (typeof paused !== 'boolean') throw new Error('Reaction pause must be boolean');
      const changed = reactionsPaused(state) !== paused;
      if (changed) state.write(key,{ owner: schema.owner,version: schema.version,data: { paused } });
      return { changed,paused };
    },
  };
}
