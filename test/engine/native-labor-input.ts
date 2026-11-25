import type { StartupHouseholdInput } from '../../src/capabilities/economy/startup/household/model';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import type { NativeLaborProof } from './native-labor-model';
export function nativeLaborSpawning(proof: NativeLaborProof, spawn: StructureSpawn, request: SpawnRequest): StartupHouseholdInput['spawning'] {
  const room = spawn.room.name;
  return { room,requests: [request],spawns: [{ id: spawn.id,room,availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
      cash: { homeEnergy: proof.initialSpawn+proof.initialEndpoint,protectedEnergy: 0,horizon: 24,readyAt: 0,selfHarvestedConstruction: 0,flows: [] },
      funding: { capacity: 300,initialEnergy: proof.initialSpawn,refills: [],energyLayout: { structures: [{ id: spawn.id,kind: 'spawn',energy: proof.initialSpawn,capacity: 300 }],orders: [{ spawn: spawn.id,structures: [spawn.id] }],regeneration: { eligibleSpawns: [spawn.id],otherRoomEnergy: 0 } } } };
}
