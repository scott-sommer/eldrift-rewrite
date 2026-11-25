import { nativeLaborTravelTicks } from './native-labor-travel';
import { quoteHouseholdLaborJob } from '../../src/capabilities/economy/startup/household/labor/quote';
import type { HouseholdLaborJob } from '../../src/capabilities/economy/startup/household/labor/model';
import type { StartupHouseholdInput, StartupHouseholdCheckpoint } from '../../src/capabilities/economy/startup/household/model';
import type { createStartupHousehold } from '../../src/capabilities/economy/startup/household/timeline';
export type LaborKind = 'build' | 'repair' | 'upgrade';
export interface LaborSnapshot { spawn: number; endpoint: number; cargo: number; bank: number; progress: number }
export interface NativeLaborProof {
  kind: LaborKind; complete: boolean; travel: boolean; targetTotal: number; initialSpawn: number; initialEndpoint: number; initialProgress: number;
  checkpoint?: StartupHouseholdCheckpoint; result?: ReturnType<ReturnType<typeof createStartupHousehold>['result']>;
  expected?: LaborSnapshot; rows: { tick: number; actual: LaborSnapshot; expected?: LaborSnapshot; position?: { x: number; y: number; fatigue: number } }[];
  calls: { tick: number; action: string; code: number; energy: number }[]; activeAt?: number;
}
export interface LaborMemory extends Memory { nativeLaborTravel?: boolean; nativeLaborComplete?: boolean; nativeLaborKind?: LaborKind; nativeLabor?: NativeLaborProof }
export function laborInput(proof: NativeLaborProof, spawn: StructureSpawn): StartupHouseholdInput {
  const room = spawn.room.name, request = { id: 'native-labor',name: 'native-labor',owner: 'fixture',room,body: ['work','carry','move'] as ('work' | 'carry' | 'move')[],priority: 0,readyAt: 0,expiresAt: 25,
    placement: { spawn: spawn.id,exit: { room,x: 14,y: 15 } } };
  let job: HouseholdLaborJob = { id: 'native-work',request: request.id,kind: proof.kind,pickupAt: 9,outboundTicks: 0,workTicks: 2,returnTicks: 0,energy: 10 };
  if (proof.travel) { job.outboundTicks = nativeLaborTravelTicks(request.body,10); job.returnTicks = nativeLaborTravelTicks(request.body,8); }
  if (proof.complete) {
    const quote = quoteHouseholdLaborJob({ job,body: request.body,horizon: 24,maximumLoad: 10,maximumWorkTicks: 2,remainingWork: proof.targetTotal-proof.initialProgress });
    if (quote.status !== 'ready') throw new Error('Expected bounded native workload quote');
    job = quote.job;
  }
  return { endpointEnergy: proof.initialEndpoint,endpointCapacity: 1000000,redistribution: { horizon: 24,trips: [] },
    labor: { horizon: 24,jobs: [job] },
    spawning: { room,requests: [request],spawns: [{ id: spawn.id,room,availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
      cash: { homeEnergy: proof.initialSpawn+proof.initialEndpoint,protectedEnergy: 0,horizon: 24,readyAt: 0,selfHarvestedConstruction: 0,flows: [] },
      funding: { capacity: 300,initialEnergy: proof.initialSpawn,refills: [],energyLayout: { structures: [{ id: spawn.id,kind: 'spawn',energy: proof.initialSpawn,capacity: 300 }],orders: [{ spawn: spawn.id,structures: [spawn.id] }],regeneration: { eligibleSpawns: [spawn.id],otherRoomEnergy: 0 } } } } };
}
export function expectedLabor(proof: NativeLaborProof, saved: StartupHouseholdCheckpoint): LaborSnapshot {
  const cargo = saved.labor!.jobs[0]!.cargo, spent = saved.labor!.jobs[0]!.spent;
  return { spawn: saved.spawning.energy!.points[0]!.energy,endpoint: saved.endpointEnergy,cargo,bank: saved.spawning.funding.bank,progress: Math.min(spent*(proof.kind === 'repair' ? 100 : 1),proof.targetTotal-proof.initialProgress) };
}
