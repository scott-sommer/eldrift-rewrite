import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { createNativeStructureActions } from '../adapters/screeps/structure-actions';
import { reactionReagents } from '../capabilities/industry/labs/model';
import { selectReactionNetwork } from '../capabilities/industry/labs/topology';
import { planLabReactions } from '../capabilities/industry/labs/plan';
import { reserveLabReaction } from '../features/industry/reaction-claims';
import { nativeProductStock, nativeReactionLabs } from './native-lab-facts';
/** Desired production, topology, quantity ownership and native effects remain separate boundaries. */
export function createNativeLabs(state: StatePort,actions: Pick<ReturnType<typeof createNativeStructureActions>,'react'>): RoomFeature {
  return { id: 'lab-reactions',urgency: 'background',interval: 1,run(context) {
    const config = context.config.values;
    if (!config.labReactionsEnabled || !config.labReactionProduct) return;
    const room = Game.rooms[context.room.name];
    if (!room) return;
    const product = config.labReactionProduct, reagents = reactionReagents(REACTIONS,product);
    if (!reagents) throw new Error('Unknown lab reaction product: '+product);
    const needed = Math.max(0,config.labReactionTarget-nativeProductStock(room,product));
    const facts = nativeReactionLabs(state,room,config.labReservedIds), network = selectReactionNetwork(facts.available,reagents,product);
    if (!network) return;
    for (const reaction of planLabReactions(network,product,needed,config.labReagentReserve)) {
      if (!reserveLabReaction(state,room.name,Game.time,reaction,facts.physical)) continue;
      const output = Game.getObjectById(reaction.output as Id<StructureLab>)!;
      const first = Game.getObjectById(reaction.inputs[0] as Id<StructureLab>)!, second = Game.getObjectById(reaction.inputs[1] as Id<StructureLab>)!;
      actions.react(output,first,second,'industry');
    }
  } };
}
