import { observePaidHomeBodies } from './bodies';
import { observePaidHomeInventory } from './inventory';
import { peekState } from '../../../../persistence/versioned-state';
import { quantitySchema } from '../../../../persistence/quantities/schema';
import { startupClaimedPoolTotals,startupHomeStock } from '../stock';
import { observeStartupEndpoint } from '../endpoint-facts';
import { observeStartupWorker } from '../worker-facts';
import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { logisticsPool } from '../../../../capabilities/logistics/request';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { StartupStructures } from '../model';
export function paidHomeAssets(state: StatePort,structures: StartupStructures,name: string,endpointId: string,guard: () => boolean) {
  const home = Game.rooms[name]; if (!home?.controller?.my) return undefined;
  const claims = (peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? []).filter(claim => claim.expiresAt > Game.time);
  const totals = startupClaimedPoolTotals(claims,Game.time),endpoint = observeStartupEndpoint(endpointId,home,totals); if (!endpoint) return undefined;
  const roster = Object.values(Game.creeps).filter(creep => creep.my && (creep.memory.population?.home === name || creep.pos.roomName === name));
  if (roster.length > 128 || !guard()) return undefined;
  const workers = roster.map(observeStartupWorker).sort((a,b) => a.name.localeCompare(b.name));
  const stock = startupHomeStock(state,structures,home,totals);
  const stores = home.find(FIND_MY_STRUCTURES).filter((item): item is StructureSpawn | StructureExtension | StructureStorage | StructureTerminal => ['spawn','extension','storage','terminal'].includes(item.structureType));
  const bank = Game.getObjectById(endpoint.id as Id<StructureStorage | StructureTerminal | StructureContainer>); if (!bank) return undefined;
  const inventories = [...new Map([...stores,bank].map(target => [target.id,observePaidHomeInventory(target)])).values()];
  const bodies = observePaidHomeBodies(roster);
  const pools = [logisticsPool('capacity',endpoint.id),logisticsPool('stock',endpoint.id,'energy'),...stores.map(store => logisticsPool('stock',store.id,'energy'))];
  const spawns = home.find(FIND_MY_SPAWNS).map(spawn => ({ id: spawn.id,position: movementPosition(spawn.pos),remainingTime: spawn.spawning?.remainingTime ?? 0 })).sort((a,b) => a.id.localeCompare(b.id));
  return { endpoint,stock,workers,spawns,claims,pools,inventories,bodies };
}
