import { vi } from 'vitest';
import { startupFixture, startupPosition } from './remote-startup';
import { createNativeStartupFacts } from '../../src/app/remotes/startup/facts';
import type { StartupFactsRequest } from '../../src/app/remotes/startup/facts-model';
export function startupFactsFixture() {
  const base = startupFixture();
  for (const [name,value] of Object.entries({ FIND_SOURCES: 6,FIND_MY_SPAWNS: 4,FIND_HOSTILE_CREEPS: 5,LOOK_STRUCTURES: 'structure',LOOK_CONSTRUCTION_SITES: 'constructionSite',TERRAIN_MASK_WALL: 1,CONSTRUCTION_COST: { container: 5000 } })) vi.stubGlobal(name,value);
  const endpoint = { id: 'bank',structureType: 'storage',isActive: () => true,my: true,pos: startupPosition(25,25,'W0N1'),store: { energy: 700,getCapacity: () => 1000,getFreeCapacity: () => 300 } };
  const spawn = { id: 'spawn',structureType: 'spawn',my: true,pos: startupPosition(24,25,'W0N1'),spawning: { remainingTime: 12 } };
  const home = { name: 'W0N1',controller: { my: true,owner: { username: 'me' } },energyAvailable: 300,energyCapacityAvailable: 1300,storage: endpoint,
    find: (kind: number) => kind === 4 ? [spawn] : [spawn,endpoint] };
  const remote = { name: 'E0N1',controller: { owner: undefined as { username: string } | undefined,reservation: undefined as { username: string; ticksToEnd: number } | undefined },
    getTerrain: () => ({ get: () => 0 }),find: (kind: number) => kind === 6 ? [base.source] : [] as unknown[],
    lookForAt: (kind: string,x: number,y: number) => (kind === 'structure' ? base.structures : base.sites).filter(item => (item as { pos: { x: number; y: number } }).pos.x === x && (item as { pos: { x: number; y: number } }).pos.y === y) };
  base.game.rooms.W0N1 = home; base.game.rooms.E0N1 = remote;
  base.game.getObjectById = (id: string) => ({ source: base.source,bank: endpoint }[id] ?? null) as Source | null;
  const request: StartupFactsRequest = { home: 'W0N1',room: 'E0N1',source: 'source',station: { room: 'E0N1',x: 5,y: 24 },endpoint: 'bank',username: 'me',tick: 1 };
  const observe = createNativeStartupFacts(base.state,base.ledger);
  return { ...base,home,remote,endpoint,spawn,request,observe };
}
