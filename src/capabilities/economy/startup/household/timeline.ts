import { StartupCheckpointCapacityError } from '../checkpoints/capacity';
import { copyPlain } from '../../../../core/plain-data';
import { spawnedActiveTicks } from '../../../spawning/lifetime';
import { snapshotStartupSpawns } from '../snapshot';
import { createStartupSpawnTimeline } from '../spawn-timeline';
import { createStartupRedistribution } from '../redistribution/transfer';
import { startupFlowDue } from '../flow';
import type { StartupCashFlow, StartupCashReceipt } from '../cash-model';
import type { StartupScheduledBirth } from '../spawn-model';
import { validateHousehold, householdIdentity } from './validation';
import { readHouseholdCheckpoint, validateHouseholdLinks } from './checkpoint';
import type { StartupHouseholdInput, StartupHouseholdCheckpoint } from './model';
/** Paid births and physical transfers share actual frame phases; no project/native owner is replaced. */
export function createStartupHousehold(input: StartupHouseholdInput, checkpoint?: StartupHouseholdCheckpoint) {
  validateHousehold(input);
  return new Household({ ...input,spawning: snapshotStartupSpawns(input.spawning),redistribution: copyPlain(input.redistribution) },checkpoint);
}
class Household {
  private readonly binding: string;
  private readonly timeline;
  private readonly transfers;
  private readonly births = new Map<string,StartupScheduledBirth>();
  private readonly losses: StartupCashFlow[];
  private endpoint: number;
  private spent: number;
  private received: number;
  private tick = 0;
  private open = false;
  constructor(private readonly input: StartupHouseholdInput, checkpoint?: StartupHouseholdCheckpoint) {
    this.binding = householdIdentity(input);
    const saved = initialHousehold(input,checkpoint);
    this.endpoint = saved.endpointEnergy; this.spent = saved.endpointSpentEnergy; this.received = saved.endpointReceivedEnergy;
    this.losses = saved.losses; this.tick = saved.through+1;
    this.timeline = createStartupSpawnTimeline(input.spawning,saved.spawning);
    for (const birth of saved.spawning?.births ?? []) this.births.set(birth.request,birth);
    this.transfers = createStartupRedistribution(input.redistribution,{ worker: request => this.worker(request),withdraw: energy => this.withdraw(energy),
      deposit: energy => this.timeline.transferHousehold(energy),lose: energy => this.lose(energy) },saved.redistribution);
    if (checkpoint !== undefined) validateHouseholdLinks(input,checkpoint,this.transfers.result());
  }
  begin(tick: number): StartupScheduledBirth[] {
    if (this.open || tick !== this.tick) throw new Error('Household frame order');
    const before = this.timeline.fundingState();
    const costs = this.input.spawning.cash.flows.filter(flow => flow.kind !== 'delivery' && startupFlowDue(flow,tick)).reduce((sum,flow) => sum+flow.energy,0);
    if (costs > before.bank-this.transfers.result().cargo) throw new Error('Household expenses require reserved cargo');
    const births = this.timeline.begin(tick);
    const total = this.timeline.frameFlows().filter(flow => flow.kind !== 'delivery').reduce((sum,flow) => sum+flow.energy,0);
    const spent = Math.min(this.endpoint,Math.max(0,total-before.accessible)); this.endpoint -= spent; this.spent += spent;
    for (const birth of births) this.births.set(birth.request,birth);
    this.open = true; return births;
  }
  finish(receipts: readonly StartupCashReceipt[] = []) {
    if (!this.open) throw new Error('Household frame not open');
    if (receipts.some(receipt => receipt.id.startsWith('household-loss:'))) throw new Error('Reserved household receipt identity');
    let effects = { withdrawn: 0,delivered: 0,lost: 0,missed: 0 };
    const flows = this.timeline.finish(receipts,() => { effects = this.transfers.step(this.tick); });
    const credit = receipts.reduce((sum,receipt) => sum+receipt.energy,0); this.endpoint += credit; this.received += credit;
    this.open = false; this.tick++; return { ...effects,flows };
  }
  checkpoint(): StartupHouseholdCheckpoint {
    if (this.open) throw new Error('Cannot checkpoint open household frame');
    const saved: StartupHouseholdCheckpoint = copyPlain({ format: 1,binding: this.binding,through: this.tick-1,endpointEnergy: this.endpoint,endpointSpentEnergy: this.spent,endpointReceivedEnergy: this.received,
      spawning: this.timeline.checkpoint(),redistribution: this.transfers.checkpoint(),losses: this.losses });
    if (JSON.stringify(saved).length > 1048576) throw new StartupCheckpointCapacityError('Household checkpoint capacity');
    return saved;
  }
  result() {
    const spawning = this.timeline.result();
    return { ...spawning,flows: [...spawning.flows,...this.losses.map(flow => ({ ...flow }))],redistribution: { ...this.transfers.result(),endpointEnergy: this.endpoint } };
  }
  private worker(id: string) {
    const birth = this.births.get(id), request = this.input.spawning.requests.find(request => request.id === id);
    return birth && request ? { activeAt: birth.activeAt,expiresAt: birth.activeAt+spawnedActiveTicks(request.body),capacity: request.body.filter(part => part === 'carry').length*50 } : undefined;
  }
  private withdraw(energy: number): number { const amount = Math.min(energy,this.endpoint); this.endpoint -= amount; return amount; }
  private lose(energy: number): void {
    const flow: StartupCashFlow = { id: 'household-loss:'+this.losses.length,kind: 'upkeep',energy,firstTick: this.tick,interval: null,occurrences: 1 };
    this.timeline.loseHousehold(flow); this.losses.push(flow);
  }
}

function initialHousehold(input: StartupHouseholdInput, checkpoint?: StartupHouseholdCheckpoint) {
  if (checkpoint !== undefined) return readHouseholdCheckpoint(input,checkpoint);
  return { endpointEnergy: input.endpointEnergy,endpointSpentEnergy: 0,endpointReceivedEnergy: 0,through: -1,losses: [] as StartupCashFlow[],spawning: undefined,redistribution: undefined };
}
