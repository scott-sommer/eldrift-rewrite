import { beginLaborPlanning } from './native-labor-planning';
import { createNativeLaborWorkforce } from '../../src/app/remotes/startup/household/labor-workforce';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { nativeLaborSpawning } from './native-labor-input';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { defaultWorkPolicy } from '../../src/features/work/policy';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import type { NativeLaborProof } from './native-labor-model';
export function nativeLaborProposal(proof: NativeLaborProof, request: SpawnRequest, spawn: StructureSpawn) {
  if (proof.proposal) return proof.proposal.job;
  const before = JSON.stringify(Memory.eldrift);
  const base = startupDeliveryInput(), storage = spawn.room.storage!;
  base.project.spawning = nativeLaborSpawning(proof,spawn,request); base.project.spawning.requests = [];
  base.project.remainingProgress = 0; base.project.workers = []; base.couriers = [];
  base.household = { endpointEnergy: proof.initialEndpoint,redistribution: { horizon: 24,trips: [] } };
  base.homeSink = { capacity: storage.store.getCapacity(RESOURCE_ENERGY),freeCapacity: storage.store.getFreeCapacity(RESOURCE_ENERGY),changes: [] };
  const proposal = createNativeLaborWorkforce(createMemoryPort(() => Memory),4000)({ base,endpoint: storage.id,demand: { home: spawn.room.name,mode: 'builder',enabled: true,budget: 200,recipe: 'balanced',maximumParts: 3,maximumUnits: 1,id: request.id,placement: request.placement!,replacementTravel: 0,replacementMargin: 0 },workPolicy: { ...defaultWorkPolicy,allowUpgrade: false },
    laborPolicy: { horizon: 24,maximumLoad: 10,maximumWorkTicks: 2,reserve: 20 } },1);
  if (proposal.status !== 'ready') throw new Error('Native workload proposal refused: '+proposal.reason);
  const candidate = proposal.read();
  if (candidate.previewFrames !== 1 || !proposal.fulfilled(forecastStartupProject(candidate.input))) throw new Error('Funded labor candidate failed its work obligation');
  Object.assign(request,candidate.proposal.input.request);
  proof.planning = beginLaborPlanning(candidate.input,candidate.binding);
  proof.proposal = candidate.proposal; proof.proposalCurrent = proposal.current(); proof.proposalReadOnly = before === JSON.stringify(Memory.eldrift);
  return proof.proposal.job;
}
