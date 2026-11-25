import { beginLaborPlanning } from './native-labor-planning';
import { createNativeLaborCandidate } from '../../src/app/remotes/startup/household/labor-candidate';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { nativeLaborSpawning } from './native-labor-input';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { observeWorkAssessment } from '../../src/adapters/screeps/work-assessment';
import { selectWork } from '../../src/features/work/select';
import { defaultWorkPolicy } from '../../src/features/work/policy';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import type { NativeLaborProof } from './native-labor-model';
export function nativeLaborProposal(proof: NativeLaborProof, request: SpawnRequest, spawn: StructureSpawn) {
  if (proof.proposal) return proof.proposal.job;
  const point = { room: spawn.room.name,x: 14,y: 15 },before = JSON.stringify(Memory.eldrift);
  const order = selectWork(observeWorkAssessment(spawn.room),point,'builder',{ ...defaultWorkPolicy,allowUpgrade: false });
  if (!order || order.kind !== 'build') throw new Error('Expected policy-selected construction target');
  const base = startupDeliveryInput(), storage = spawn.room.storage!;
  base.project.spawning = nativeLaborSpawning(proof,spawn,request); base.project.spawning.requests = [];
  base.project.remainingProgress = 0; base.project.workers = []; base.couriers = [];
  base.household = { endpointEnergy: proof.initialEndpoint,redistribution: { horizon: 24,trips: [] } };
  base.homeSink = { capacity: storage.store.getCapacity(RESOURCE_ENERGY),freeCapacity: storage.store.getFreeCapacity(RESOURCE_ENERGY),changes: [] };
  const proposal = createNativeLaborCandidate(createMemoryPort(() => Memory),4000)({ base,endpoint: storage.id,proposal: {
    observedAt: Game.time,request,source: storage.id,pickup: point,order,service: point,
    policy: { horizon: 24,maximumLoad: 10,maximumWorkTicks: 2,reserve: 20 } } },1);
  if (proposal.status !== 'ready') throw new Error('Native workload proposal refused: '+proposal.reason);
  const candidate = proposal.read();
  if (candidate.previewFrames !== 1 || !proposal.fulfilled(forecastStartupProject(candidate.input))) throw new Error('Funded labor candidate failed its work obligation');
  proof.planning = beginLaborPlanning(candidate.input,candidate.binding);
  proof.proposal = candidate.proposal; proof.proposalCurrent = proposal.current(); proof.proposalReadOnly = before === JSON.stringify(Memory.eldrift);
  return proof.proposal.job;
}
