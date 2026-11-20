import type { StatePort } from '../persistence/versioned-state';
import { peekState } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import type { LabConfig } from '../config/labs';
import { reactionReagents } from '../capabilities/industry/labs/model';
import { selectLabProduction, clearLabProduction } from '../features/industry/production';
import { labStateSchema } from '../features/industry/lab-state';
import { nativeProductionInventory } from './native-production-inventory';
import { nativeProductStock } from './native-lab-facts';
import type { LabRecipe } from '../features/industry/lab-assignment';
export interface NativeProduction { recipe: LabRecipe | null; needed: number }
export function nativeLabProduction(state: StatePort,room: Room,config: Readonly<LabConfig>): NativeProduction {
  if (!config.labReactionsEnabled || !config.labProductionTargets.length) return directProduction(state,room,config);
  const inventory = nativeProductionInventory(state,room,config);
  const context = JSON.stringify(['production/2',config.labProductionTargets,config.labProductionBatch,config.labReagentReserve,config.labSupplyReserve,config.labReservedIds]);
  const step = selectLabProduction(state,room.name,context,config.labProductionTargets,inventory,product => reactionReagents(REACTIONS,product),
    { batch: config.labProductionBatch,reactionAmount: LAB_REACTION_AMOUNT,inputReserve: config.labReagentReserve,maximumNodes: 1024 });
  if (step) return { recipe: step,needed: Math.max(0,step.target-(inventory.total[step.product] ?? 0)) };
  // Idle assignments continue banking real output, without another refill or reaction.
  const previous = peekState(state,stateKey('industry-labs',room.name),labStateSchema)?.assignment;
  return { recipe: previous ?? null,needed: 0 };
}
function directProduction(state: StatePort,room: Room,config: Readonly<LabConfig>): NativeProduction {
  clearLabProduction(state,room.name);
  if (!config.labReactionsEnabled || !config.labReactionProduct) return { recipe: null,needed: 0 };
  const product = config.labReactionProduct, reagents = reactionReagents(REACTIONS,product);
  if (!reagents) throw new Error('Unknown lab reaction product: '+product);
  return { recipe: { product,reagents },needed: Math.max(0,config.labReactionTarget-nativeProductStock(room,product)) };
}
