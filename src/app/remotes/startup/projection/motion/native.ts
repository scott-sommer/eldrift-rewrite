import { nativeMotionEnvironment } from './native-terrain';
import { copyPlain } from '../../../../../core/plain-data';
import { createMatrixSnapshots } from '../../../../../adapters/screeps/matrix-snapshots';
import { createIntelStore } from '../../../../../features/intel/store';
import { prepareRemoteMatrices } from '../../../assessment/matrices';
import { compileStartupMotionGeometry } from './compile';
import type { StatePort } from '../../../../../persistence/versioned-state';
import type { StartupBirthProposal } from '../model';
import type { NativeMotionQuote,NativeMotionGeometry } from './model';
/** Fresh terrain/topology observations; does not publish a proposal or assume other crews are absent. */
export function createNativeStartupMotionGeometry(state: StatePort) {
  const intel = createIntelStore(state),snapshots = createMatrixSnapshots();
  return (quote: NativeMotionQuote,births: readonly StartupBirthProposal[],guard: () => boolean = () => true): NativeMotionGeometry => {
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    if (quote.observedAt !== Game.time || quote.facts.observedAt !== Game.time) return { status: 'deferred',reason: 'stale-observation' };
    quote = copyPlain(quote); births = copyPlain(births);
    const context = { intel: (room: string) => intel.peek(room,Game.time).record };
    if (quote.rooms.length > 64 || !quote.rooms.includes(quote.plan.home) || !quote.rooms.includes(quote.plan.room)) return { status: 'deferred',reason: 'motion-rooms' };
    if (quote.rooms.some(room => !Game.rooms[room] && !context.intel(room).summary)) return { status: 'deferred',reason: 'motion-room-facts' };
    const matrices = prepareRemoteMatrices(context,quote.rooms,1,snapshots);
    return compileStartupMotionGeometry(quote,births,nativeMotionEnvironment(matrices,quote.rooms),guard);
  };
}
