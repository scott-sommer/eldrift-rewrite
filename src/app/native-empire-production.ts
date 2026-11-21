import { reactionsPaused } from '../features/industry/reaction-control';
import { maintainLostEmpireSupply } from './native-empire-loss';
import type { StatePort } from '../persistence/versioned-state';
import type { LabConfig } from '../config/labs';
import { createEmpireProductionStore } from '../features/industry/empire-production/store';
import { coordinateEmpireProduction } from '../features/industry/empire-production/coordinator';
import type { EmpireProductionWindow } from '../features/industry/empire-production/model';
import { reactionReagents } from '../capabilities/industry/labs/model';
import { empireLabSnapshot, empireRoomSettled, idleEmpireProduction } from './native-empire-lab-facts';
export function createNativeEmpireProduction(state: StatePort,configuration: (home?: string) => Readonly<LabConfig>) {
  const store = createEmpireProductionStore(state,home => empireRoomSettled(state,home));
  let tick: number | undefined, windows: EmpireProductionWindow[] = [];
  function refresh(): void {
    if (tick === Game.time) return;
    const policy = configuration(), owned = Object.values(Game.rooms).filter(room => room.controller?.my);
    const entries = owned.map(room => ({ room,config: configuration(room.name) }));
    const participants = empireParticipants(state,entries);
    if (!participants.length && !store.list().length) { tick = Game.time; windows = []; return; }
    if (participants.some(item => JSON.stringify(item.config.labProductionTargets) !== JSON.stringify(policy.labProductionTargets))) throw new Error('Empire production targets must match shared empire policy');
    maintainLostEmpireSupply(state,store.list().map(window => window.home));
    const snapshots = entries.map(item => ({ ...empireLabSnapshot(state,item.room,item.config),participating: participants.includes(item) }));
    const stock: Record<string,number> = {};
    for (const snapshot of snapshots) for (const [resource,amount] of Object.entries(snapshot.inventory.total)) stock[resource] = (stock[resource] ?? 0)+amount;
    windows = coordinateEmpireProduction(store,{ context: JSON.stringify(['empire-production/1',policy.labProductionTargets,participants.map(item => [item.room.name,item.config.labProductionBatch,item.config.labReagentReserve,item.config.labSupplyReserve]).sort()]),
      targets: policy.labProductionTargets,stock,rooms: snapshots.filter(item => item.participating),visible: new Set(Object.keys(Game.rooms)),maximumNodes: 10000 },product => reactionReagents(REACTIONS,product));
    tick = Game.time;
  }
  return (home: string) => {
    refresh(); const window = windows.find(item => item.home === home), config = configuration(home);
    if (!window && config.labProductionScope !== 'empire') return null;
    if (!window || window.retiring || !window.step) return idleEmpireProduction(state,home);
    const room = Game.rooms[home]!;
    const snapshot = empireLabSnapshot(state,room,config);
    return { recipe: window.step,needed: Math.max(0,window.step.target-(snapshot.inventory.total[window.step.product] ?? 0)) };
  };
}

function empireParticipants<T extends { config: Readonly<LabConfig> }>(state: StatePort,entries: readonly T[]): T[] {
  if (reactionsPaused(state)) return [];
  return entries.filter(item => item.config.labProductionScope === 'empire' && item.config.labReactionsEnabled);
}
