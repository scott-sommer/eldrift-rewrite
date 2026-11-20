import type { LabConfig } from '../config/labs';
import type { ReactionLab, ReactionNetwork } from '../capabilities/industry/labs/model';
import { stateKey } from '../persistence/state-key';
import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { createNativeStructureActions } from '../adapters/screeps/structure-actions';
import { reactionReagents } from '../capabilities/industry/labs/model';
import { assignedReactionNetwork } from '../capabilities/industry/labs/assignment';
import { reconcileLabAssignment } from '../features/industry/lab-assignment';
import { generateNativeLabTransport } from './native-lab-transport';
import { planLabReactions } from '../capabilities/industry/labs/plan';
import { reserveLabReaction } from '../features/industry/reaction-claims';
import { nativeProductStock, nativeReactionLabs } from './native-lab-facts';
/** Desired production, topology, quantity ownership and native effects remain separate boundaries. */
export function createNativeLabs(state: StatePort,actions: Pick<ReturnType<typeof createNativeStructureActions>,'react'>): RoomFeature {
  return { id: 'lab-reactions',urgency: 'background',interval: 1,run(context) {
    const config = context.config.values;
    if (!config.labReactionsEnabled && state.read(stateKey('industry-labs',context.room.name)) === undefined) return;
    const room = Game.rooms[context.room.name];
    if (!room) return;
    const recipe = configuredRecipe(config);
    const needed = recipe ? Math.max(0,config.labReactionTarget-nativeProductStock(room,recipe.product)) : 0;
    const facts = nativeReactionLabs(state,room,config.labReservedIds);
    const assignment = reconcileLabAssignment(state,room.name,Game.time,facts.physical,recipe);
    generateNativeLabTransport(state,room,assignment,facts.physical,needed,config);
    const network = assignment ? assignedReactionNetwork(assignment,facts.available) : null;
    if (!network) return;
    executeLabReactions(state,actions,network,assignment!.product,needed,config.labReagentReserve,facts.physical);
  } };
}
function configuredRecipe(config: Readonly<LabConfig>) {
  if (!config.labReactionsEnabled || !config.labReactionProduct) return null;
  const product = config.labReactionProduct, reagents = reactionReagents(REACTIONS,product);
  if (!reagents) throw new Error('Unknown lab reaction product: '+product);
  return { product,reagents };
}
function executeLabReactions(state: StatePort,actions: Pick<ReturnType<typeof createNativeStructureActions>,'react'>,
  network: ReactionNetwork,product: string,needed: number,reserve: number,physical: readonly ReactionLab[]): void {
  for (const reaction of planLabReactions(network,product,needed,reserve)) {
    const output = Game.getObjectById(reaction.output as Id<StructureLab>)!;
    if (!reserveLabReaction(state,output.room.name,Game.time,reaction,physical)) continue;
    const first = Game.getObjectById(reaction.inputs[0] as Id<StructureLab>)!, second = Game.getObjectById(reaction.inputs[1] as Id<StructureLab>)!;
    actions.react(output,first,second,'industry');
  }
}
