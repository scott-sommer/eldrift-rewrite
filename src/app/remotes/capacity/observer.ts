import { measureSpawnPressure } from '../../../features/population/spawn-load/pressure';
import { createSpawnLoadStore } from '../../../features/population/spawn-load/store';
import { spawnQueueSchema } from '../../../features/population/spawn-schema';
import { peekState } from '../../../persistence/versioned-state';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteConfig } from '../../../config/remotes';
import type { Failure } from '../../../core/scheduling/model';
import { stateKey } from '../../../persistence/state-key';
import { activeHomeSpawns } from './policy';
interface SpawnLoadStructures {
  availableSpawn(id: string): boolean;
  availableEnergy(home: string, available: number): number;
}
export function createNativeSpawnLoadObserver(state: StatePort, structures: SpawnLoadStructures, config: (home: string) => RemoteConfig, report: (failure: Failure) => void) {
  function observe(home: Room): void {
    if (!config(home.name).remoteAdaptiveEnabled) return;
    const requests = peekState(state,stateKey('spawning',home.name),spawnQueueSchema(home.name))?.requests ?? [];
    const slots = activeHomeSpawns(home.name).map(spawn => ({ id: spawn.id,room: home.name,
      busy: spawn.spawning !== null || !structures.availableSpawn(spawn.id) }));
    const sample = measureSpawnPressure({ room: home.name,tick: Game.time,slots,requests,
      energy: structures.availableEnergy(home.name,home.energyAvailable),capacity: home.energyCapacityAvailable,names: new Set(Object.keys(Game.creeps)) });
    createSpawnLoadStore(state,home.name).sample(Game.time,sample);
  }
  return () => {
    for (const home of Object.values(Game.rooms)) {
      if (!home.controller?.my) continue;
      try { observe(home); } catch (error) { report({ id: 'spawn-load',room: home.name,tick: Game.time,error }); }
    }
  };
}
