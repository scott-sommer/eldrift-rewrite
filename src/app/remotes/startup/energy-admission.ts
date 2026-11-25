import { nativeSpawnEnergyStructures, orderedSpawnEnergy } from '../../../adapters/screeps/spawn-energy';
import type { NativeSpawnEnergyAdmission } from '../../../adapters/screeps/spawn-energy-admission';
import { createStartupEnergyLedger } from '../../../capabilities/economy/startup/energy/ledger';
import { energyLayoutIdentity } from '../../../capabilities/economy/startup/energy/validation';
import { bodyCost } from '../../../capabilities/spawning/body';
import type { StatePort } from '../../../persistence/versioned-state';
import { observeNativeStartupEnergy } from './energy';
type Ledger = ReturnType<typeof createStartupEnergyLedger>;
interface PendingRoom { binding: string; ledger: Ledger; spent: number; revision: number }
/** Ephemeral vector debit. Unknown durable scalar debits (including same-tick reset) refuse conservatively. */
export function createNativeStartupEnergyAdmission(state: StatePort): NativeSpawnEnergyAdmission {
  const rooms = new Map<string,PendingRoom>(); let tick = -1;
  return (spawn,request,pendingEnergy) => {
    if (tick !== Game.time) { rooms.clear(); tick = Game.time; }
    const points = nativeSpawnEnergyStructures(spawn.room), origins = points.filter(point => point.structureType === 'spawn').map(point => point.id);
    const observed = observeNativeStartupEnergy(state,spawn.room.name,origins); if (observed.status !== 'observed') return null;
    const binding = energyLayoutIdentity(observed.layout), previous = rooms.get(spawn.room.name);
    if (previous && previous.spent > 0 && previous.binding !== binding) return null;
    const current = previous?.binding === binding ? previous : { binding,ledger: createStartupEnergyLedger(observed.layout),spent: 0,revision: 0 };
    if (current.spent !== pendingEnergy || current.ledger.checkpoint().events.some(event => event.holder === request.id)) return null;
    const planned = createStartupEnergyLedger(observed.layout,current.ledger.checkpoint()), cost = bodyCost(request.body);
    if (!planned.charge(spawn.id,cost,0,request.id)) return null;
    rooms.set(spawn.room.name,current);
    const revision = current.revision, preparedAt = Game.time;
    return { structures: orderedSpawnEnergy(spawn,points),commit() {
      if (Game.time !== preparedAt || current.revision !== revision) throw new Error('Stale physical energy admission');
      current.ledger = planned; current.spent += cost; current.revision++;
    } };
  };
}
