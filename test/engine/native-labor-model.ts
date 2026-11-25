import { nativeLaborSpawning } from './native-labor-input';
import type { LaborTravelQuote } from '../../src/capabilities/economy/startup/household/labor/travel';
import { nativeLaborRoute } from './native-labor-travel';
import { nativeLaborProposal } from './native-labor-proposal';
import type { LaborProposalSnapshot } from '../../src/capabilities/economy/startup/household/labor/proposal';
import type { HouseholdLaborJob } from '../../src/capabilities/economy/startup/household/labor/model';
import type { StartupHouseholdInput, StartupHouseholdCheckpoint } from '../../src/capabilities/economy/startup/household/model';
import type { createStartupHousehold } from '../../src/capabilities/economy/startup/household/timeline';
export type LaborKind = 'build' | 'repair' | 'upgrade';
export interface LaborSnapshot { spawn: number; endpoint: number; cargo: number; bank: number; progress: number }
export interface NativeLaborProof {
  kind: LaborKind; complete: boolean; travel: boolean; targetTotal: number; initialSpawn: number; initialEndpoint: number; initialProgress: number;
  proposal?: LaborProposalSnapshot; proposalCurrent?: boolean; proposalReadOnly?: boolean; travelQuote?: LaborTravelQuote; routeReadOnly?: boolean; checkpoint?: StartupHouseholdCheckpoint; result?: ReturnType<ReturnType<typeof createStartupHousehold>['result']>;
  expected?: LaborSnapshot; rows: { tick: number; actual: LaborSnapshot; expected?: LaborSnapshot; position?: { x: number; y: number; fatigue: number } }[];
  calls: { tick: number; action: string; code: number; energy: number }[]; activeAt?: number;
}
export interface LaborMemory extends Memory { nativeLaborTravel?: boolean; nativeLaborComplete?: boolean; nativeLaborKind?: LaborKind; nativeLabor?: NativeLaborProof }
export function laborInput(proof: NativeLaborProof, spawn: StructureSpawn): StartupHouseholdInput {
  const room = spawn.room.name, request = { id: 'native-labor',name: 'native-labor',owner: 'fixture',room,body: ['work','carry','move'] as ('work' | 'carry' | 'move')[],priority: 0,readyAt: 0,expiresAt: 25,
    placement: { spawn: spawn.id,exit: { room,x: 14,y: 15 } } };
  let job: HouseholdLaborJob = { id: 'native-work',request: request.id,kind: proof.kind,pickupAt: 9,outboundTicks: 0,workTicks: 2,returnTicks: 0,energy: 10 };
  if (proof.travel) { const quote = nativeLaborRoute(proof,request.body,spawn); job.outboundTicks = quote.legs[1]!.ticks; job.returnTicks = quote.legs[2]!.ticks; }
  if (proof.complete) job = nativeLaborProposal(proof,request,spawn);
  return { endpointEnergy: proof.initialEndpoint,endpointCapacity: 1000000,redistribution: { horizon: 24,trips: [] },
    labor: { horizon: 24,jobs: [job] },
    spawning: nativeLaborSpawning(proof,spawn,request) };
}
export function expectedLabor(proof: NativeLaborProof, saved: StartupHouseholdCheckpoint): LaborSnapshot {
  const cargo = saved.labor!.jobs[0]!.cargo, spent = saved.labor!.jobs[0]!.spent;
  return { spawn: saved.spawning.energy!.points[0]!.energy,endpoint: saved.endpointEnergy,cargo,bank: saved.spawning.funding.bank,progress: Math.min(spent*(proof.kind === 'repair' ? 100 : 1),proof.targetTotal-proof.initialProgress) };
}
