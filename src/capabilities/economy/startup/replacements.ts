import { restoreStartupProject } from './project';
import { snapshotStartupProject } from './snapshot';
import { startupReplacementProposals } from './replacement-proposals';
import type { StartupReplacementProposal } from './replacement-proposals';
import type { StartupDeliveryInput } from './delivery-model';
/** Adds one finite funded request; caller must reevaluate the new input before extending again. */
export function extendStartupReplacements(input: StartupDeliveryInput, checkpoint: unknown) {
  const project = restoreStartupProject(input,checkpoint);
  if (!project.advance(0).done) return deferred('incomplete');
  const result = project.result(), next = snapshotStartupProject(input);
  if (needsIncumbentTemplate(next)) return deferred('incumbent-template');
  const service = [...next.project.workers,...next.couriers];
  if (service.some(worker => !result.spawning.births.some(birth => birth.request === worker.request))) return deferred('unfunded-service');
  const proposal = startupReplacementProposals(next,result.spawning.births)[0];
  if (!proposal) return { status: 'complete' as const };
  if (!hasCapacity(next,proposal)) return deferred('capacity');
  if (next.project.spawning.requests.some(request => request.id === proposal.request.id || request.name === proposal.request.name) || next.project.spawning.liveNames.has(proposal.request.name)) return deferred('identity-conflict');
  appendReplacement(next,proposal);
  return { status: 'extended' as const,parent: proposal.parent,kind: proposal.kind,request: proposal.request.id,input: next };
}
function needsIncumbentTemplate(input: StartupDeliveryInput): boolean {
  return !!input.initial?.miner || (input.initial?.couriers.length ?? 0) > 0;
}
function hasCapacity(input: StartupDeliveryInput, proposal: StartupReplacementProposal): boolean {
  const spawning = input.project.spawning;
  if (spawning.requests.length >= 64 || spawning.requests.length+spawning.cash.flows.length >= 128 || proposal.request.id.length > 240) return false;
  return proposal.kind === 'miner' ? input.project.workers.length < 64 : input.couriers.length < 16;
}
function appendReplacement(input: StartupDeliveryInput, proposal: StartupReplacementProposal): void {
  input.project.spawning.requests = [...input.project.spawning.requests,proposal.request];
  if (proposal.kind === 'miner') {
    const worker = input.project.workers.find(worker => worker.request === proposal.parent)!;
    input.project.workers = [...input.project.workers,{ ...worker,request: proposal.request.id }];
  } else {
    const worker = input.couriers.find(worker => worker.request === proposal.parent)!;
    input.couriers = [...input.couriers,{ ...worker,request: proposal.request.id }];
  }
}
function deferred(reason: string) { return { status: 'deferred' as const,reason }; }
