import { createNativeLaborProposal } from '../../src/app/remotes/startup/household/labor-proposal';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { observeWorkAssessment } from '../../src/adapters/screeps/work-assessment';
import { selectWork } from '../../src/features/work/select';
import { defaultWorkPolicy } from '../../src/features/work/policy';
import { bodyCost } from '../../src/capabilities/spawning/body';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import type { NativeLaborProof } from './native-labor-model';
export function nativeLaborProposal(proof: NativeLaborProof, request: SpawnRequest, spawn: StructureSpawn) {
  if (proof.proposal) return proof.proposal.job;
  const point = { room: spawn.room.name,x: 14,y: 15 },before = JSON.stringify(Memory.eldrift);
  const order = selectWork(observeWorkAssessment(spawn.room),point,'builder',{ ...defaultWorkPolicy,allowUpgrade: false });
  if (!order || order.kind !== 'build') throw new Error('Expected policy-selected construction target');
  const proposal = createNativeLaborProposal(createMemoryPort(() => Memory),4000)({ observedAt: Game.time,request,
    birth: { request: request.id,spawn: spawn.id,startAt: 0,activeAt: request.body.length*3,cost: bodyCost(request.body) },source: spawn.room.storage!.id,pickup: point,order,service: point,
    policy: { horizon: 24,maximumLoad: 10,maximumWorkTicks: 2,reserve: 20 } });
  if (proposal.status !== 'ready') throw new Error('Native workload proposal refused: '+proposal.reason);
  proof.proposal = proposal.read(); proof.proposalCurrent = proposal.current(); proof.proposalReadOnly = before === JSON.stringify(Memory.eldrift);
  return proof.proposal.job;
}
