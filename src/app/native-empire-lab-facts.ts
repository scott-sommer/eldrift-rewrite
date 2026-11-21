import { lostEmpireRoomSettled } from './native-empire-loss';
import type { LabConfig } from '../config/labs';
import type { StatePort } from '../persistence/versioned-state';
import { peekState } from '../persistence/versioned-state';
import { labStateSchema } from '../features/industry/lab-state';
import { labServicesBusy } from '../features/industry/lab-services';
import { nativeReactionLabs } from './native-lab-facts';
import { nativeProductionInventory } from './native-production-inventory';
import { nativeLabSettings } from './native-lab-settings';
import { assignReactionLabs } from '../capabilities/industry/labs/assignment';
import { reactionReagents } from '../capabilities/industry/labs/model';
export function labAssignment(state: StatePort,home: string) { return peekState(state,'industry-labs/'+home,labStateSchema)?.assignment ?? null; }
export function empireRoomSettled(state: StatePort,home: string): boolean {
  if (!Game.rooms[home]?.controller?.my) return lostEmpireRoomSettled(state,home);
  return !labAssignment(state,home) && !labServicesBusy(state,home,Game.time);
}
export function idleEmpireProduction(state: StatePort,home: string) {
  const assignment = labAssignment(state,home);
  if (!assignment) return { recipe: null,needed: 0 };
  const output = assignment.outputs.some(id => (Game.getObjectById(id as Id<StructureLab>)?.mineralAmount ?? 0) > 0);
  return { recipe: output || labServicesBusy(state,home,Game.time) ? assignment : null,needed: 0 };
}
export function empireLabSnapshot(state: StatePort,room: Room,settings: Readonly<LabConfig>) {
  const config = nativeLabSettings(state,room.name,settings), inventory = nativeProductionInventory(state,room,config);
  const product = config.labProductionTargets[0]?.product ?? '', reagents = reactionReagents(REACTIONS,product);
  const topology = reagents ? assignReactionLabs(nativeReactionLabs(state,room,config.labReservedIds).physical,product,reagents) : null;
  return { home: room.name,inventory,ready: !!topology && empireRoomSettled(state,room.name),
    options: { batch: config.labProductionBatch,reactionAmount: LAB_REACTION_AMOUNT,inputReserve: config.labReagentReserve,maximumNodes: 1024 } };
}
