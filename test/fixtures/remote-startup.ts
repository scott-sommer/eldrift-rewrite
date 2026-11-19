import { vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { remoteFleetOwner } from '../../src/features/remotes/fleet/identity';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
import { createNativeRemoteStartup } from '../../src/app/remotes/startup/native';
import { resolveConfig } from '../../src/config/resolve';
export function startupPosition(x: number,y: number,roomName = 'E0N1') {
  return { x,y,roomName,inRangeTo: (other: { x: number; y: number; roomName: string },range: number) => other.roomName === roomName && Math.max(Math.abs(x-other.x),Math.abs(y-other.y)) <= range,
    isEqualTo: (other: { x: number; y: number; roomName: string }) => other.roomName === roomName && x === other.x && y === other.y };
}
export function startupFixture() {
  for (const [name,value] of Object.entries({ FIND_MY_STRUCTURES: 1,FIND_STRUCTURES: 2,FIND_MY_CONSTRUCTION_SITES: 3,STRUCTURE_CONTAINER: 'container',RESOURCE_ENERGY: 'energy',WORK: 'work',HARVEST_POWER: 2,BUILD_POWER: 5,ENERGY_REGEN_TIME: 300 })) vi.stubGlobal(name,value);
  const root = {},state = createMemoryPort(() => root), assignments = createRemoteAssignmentStore(state);
  assignments.reconcile({ home: 'W0N1',tick: 1,lifetime: 100,expectedRevision: 0,plans: [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null },{ room: 'E0N2',sources: ['other'],reserve: null,infrastructure: null }] });
  function profile(room: string,source: string,kind: 'miner' | 'courier'): RemoteFleetProfile {
    const result: RemoteFleetProfile = { home: 'W0N1',room,source,kind,generation: 1,owner: '',body: kind === 'miner' ? ['work','work','work','work','carry','move','move'] : ['carry','carry','move','move'],desired: kind === 'miner' ? 1 : 2,travelTicks: 10,retireTicks: 30,marginTicks: 5,priority: kind === 'miner' ? 20 : 30 };
    result.owner = remoteFleetOwner(result); return result;
  }
  const miner = profile('E0N1','source','miner'),courier = profile('E0N1','source','courier'),otherMiner = profile('E0N2','other','miner'),otherCourier = profile('E0N2','other','courier');
  createRemoteFleetStore(state,'W0N1').save(0,1,[miner,courier,otherMiner,otherCourier]);
  const source = { id: 'source',pos: startupPosition(6,25),energy: 1500,energyCapacity: 1500,ticksToRegeneration: undefined } as unknown as Source;
  const structures: unknown[] = [],sites: unknown[] = [];
  const home = { name: 'W0N1',controller: { my: true },energyAvailable: 1300,storage: undefined as { id: string; store: { energy: number } } | undefined,
    find: () => [{ id: 'spawn',structureType: 'spawn' },...(home.storage ? [{ id: home.storage.id,structureType: 'storage' }] : [])] };
  const remote = { name: 'E0N1',find: (kind: number) => kind === 2 ? structures : sites };
  const game = { time: 1,creeps: {} as Record<string,Creep>,rooms: { W0N1: home,E0N1: remote } as Record<string,unknown>,getObjectById: (id: string) => id === 'source' ? source : null };
  vi.stubGlobal('Game',game);
  const config = { ...resolveConfig({},1).values,remoteStartupPolicy: 'staged' as const,constructionEnabled: true };
  const ledger = { availableEnergy: vi.fn((_home: string,available: number) => available) };
  const startup = createNativeRemoteStartup(state,ledger,() => config);
  function activeMiner(spawning = false): Creep {
    const body = miner.body.map(type => ({ type,hits: 100 }));
    return { name: 'miner',my: true,spawning,memory: { population: { home: 'W0N1',owner: miner.owner } },body,pos: startupPosition(5,24),ticksToLive: 1400,
      getActiveBodyparts: (part: string) => body.filter(item => item.type === part).length,store: { energy: 0,getCapacity: () => 50 } } as unknown as Creep;
  }
  return { root,state,assignments,miner,courier,otherMiner,otherCourier,source,home,structures,sites,game,config,ledger,startup,activeMiner };
}
