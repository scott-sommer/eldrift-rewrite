import { accepted } from './labor/validation';
import { createHouseholdLabor } from './labor/timeline';
import { laborConstruction, laborFlows, laborTotals } from './labor/funding';
import type { HouseholdLaborJob } from './labor/model';
import { startupExpenseTotals } from '../cash-expenses';
import { StartupCheckpointCapacityError } from '../checkpoints/capacity';
import { copyPlain } from '../../../../core/plain-data';
import { spawnedActiveTicks } from '../../../spawning/lifetime';
import { snapshotStartupSpawns } from '../snapshot';
import { createStartupSpawnTimeline } from '../spawn-timeline';
import { createStartupRedistribution } from '../redistribution/transfer';
import { startupFlowDue } from '../flow';
import type { StartupCashFlow, StartupCashReceipt } from '../cash-model';
import type { StartupScheduledBirth } from '../spawn-model';
import { validateHousehold, householdIdentity, householdCheckpointFormat } from './validation';
import { readHouseholdCheckpoint, validateHouseholdLinks } from './checkpoint';
import type { StartupHouseholdInput, StartupHouseholdCheckpoint } from './model';
/** Paid births and physical transfers share actual frame phases; no project/native owner is replaced. */
export function createStartupHousehold(input: StartupHouseholdInput, checkpoint?: StartupHouseholdCheckpoint) {
  validateHousehold(input);
  return new Household({ ...input,spawning: snapshotStartupSpawns(input.spawning),redistribution: copyPlain(input.redistribution),...(input.labor ? { labor: copyPlain(input.labor) } : {}) },checkpoint);
}
class Household {
  private readonly binding: string;
  private readonly timeline;
  private readonly transfers;
  private readonly labor: ReturnType<typeof createHouseholdLabor> | undefined;
  private incoming = 0;
  private acceptReturn: (energy: number) => number = energy => energy;
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
    this.timeline = createStartupSpawnTimeline(input.spawning,saved.spawning,laborConstruction(input.labor,saved.labor));
    for (const birth of saved.spawning?.births ?? []) this.births.set(birth.request,birth);
    this.transfers = createStartupRedistribution(input.redistribution,{ worker: request => this.worker(request),withdraw: energy => this.withdraw(energy),
      deposit: (energy,trip) => this.timeline.transferHousehold(energy,trip.destination,trip.id),lose: energy => this.lose(energy) },saved.redistribution);
    this.labor = input.labor ? createHouseholdLabor(input.labor,{ worker: request => this.laborWorker(request),withdraw: energy => this.withdraw(energy),
      consume: (energy,job) => this.consume(energy,job),deposit: energy => this.returnLabor(energy),lose: energy => this.lose(energy) },saved.labor) : undefined;
    if (checkpoint !== undefined) validateHouseholdLinks(input,checkpoint,this.transfers.result());
  }
  begin(tick: number): StartupScheduledBirth[] {
    if (this.open || tick !== this.tick) throw new Error('Household frame order');
    const before = this.timeline.fundingState();
    const expenses = startupExpenseTotals(this.input.spawning.cash.flows.filter(flow => startupFlowDue(flow,tick))), costs = expenses.outside+expenses.unlocated;
    if (expenses.outside > this.endpoint) throw new Error('Household endpoint cannot fund outside expense');
    if (costs > before.bank-this.transfers.result().cargo-laborTotals(this.labor?.result()).cargo) throw new Error('Household expenses require reserved cargo');
    const births = this.timeline.begin(tick);
    const total = this.timeline.frameFlows().filter(flow => flow.kind !== 'delivery').reduce((sum,flow) => sum+flow.energy,0);
    const spent = expenses.outside+Math.min(this.endpoint-expenses.outside,Math.max(0,total-expenses.outside-before.accessible)); this.endpoint -= spent; this.spent += spent;
    for (const birth of births) this.births.set(birth.request,birth);
    this.open = true; return births;
  }
  finish(receipts: readonly StartupCashReceipt[] = [], acceptReturn: (energy: number) => number = energy => energy) {
    if (!this.open) throw new Error('Household frame not open');
    if (receipts.some(receipt => receipt.id.startsWith('household-loss:') || receipt.id.startsWith('household-work:'))) throw new Error('Reserved household receipt identity');
    const before = laborTotals(this.labor?.result()); this.acceptReturn = acceptReturn;
    this.incoming = receipts.reduce((sum,receipt) => sum+receipt.energy,0);
    if (this.input.labor && this.endpoint+this.incoming > this.input.endpointCapacity!) throw new Error('Labor endpoint receipt capacity');
    let effects = { withdrawn: 0,delivered: 0,lost: 0,missed: 0 };
    const flows = this.timeline.finish(receipts,() => { effects = this.transfers.step(this.tick); this.labor?.step(this.tick); });
    const credit = receipts.reduce((sum,receipt) => sum+receipt.energy,0); this.endpoint += credit; this.received += credit;
    this.open = false; this.tick++; return { ...effects,laborWithdrawn: laborTotals(this.labor?.result()).picked-before.picked,flows };
  }
  frameOutsideExpense(): number { return this.timeline.frameOutsideExpense(); }
  frameAmbientEnergy(): number { return this.timeline.frameAmbientEnergy(); }
  checkpoint(): StartupHouseholdCheckpoint {
    if (this.open) throw new Error('Cannot checkpoint open household frame');
    const saved: StartupHouseholdCheckpoint = copyPlain({ format: householdCheckpointFormat(this.input),binding: this.binding,through: this.tick-1,endpointEnergy: this.endpoint,endpointSpentEnergy: this.spent,endpointReceivedEnergy: this.received,
      spawning: this.timeline.checkpoint(),redistribution: this.transfers.checkpoint(),...(this.labor ? { labor: this.labor.checkpoint() } : {}),losses: this.losses });
    if (JSON.stringify(saved).length > 1048576) throw new StartupCheckpointCapacityError('Household checkpoint capacity');
    return saved;
  }
  result() {
    const spawning = this.timeline.result();
    return { ...spawning,flows: [...spawning.flows,...this.losses.map(flow => ({ ...flow })),...laborFlows(this.input.labor,this.labor?.checkpoint())],...(this.labor ? { labor: this.labor.result() } : {}),redistribution: { ...this.transfers.result(),endpointEnergy: this.endpoint } };
  }
  private worker(id: string) {
    const birth = this.births.get(id), request = this.input.spawning.requests.find(request => request.id === id);
    return birth && request ? { activeAt: birth.activeAt,expiresAt: birth.activeAt+spawnedActiveTicks(request.body),capacity: request.body.filter(part => part === 'carry').length*50 } : undefined;
  }
  private laborWorker(id: string) {
    const birth = this.births.get(id), request = this.input.spawning.requests.find(request => request.id === id);
    return birth && request ? { birth,body: request.body } : undefined;
  }
  private consume(energy: number, job: HouseholdLaborJob): number {
    this.timeline.spendHousehold({ id: 'household-work:'+job.id+':'+this.tick,kind: job.kind === 'build' ? 'home-construction' : 'upkeep',spending: 'outside-spawn',energy,firstTick: this.tick,interval: null,occurrences: 1 });
    return energy;
  }
  private returnLabor(energy: number): number {
    const maximum = Math.max(0,Math.min(energy,this.input.endpointCapacity!-this.endpoint-this.incoming));
    const amount = accepted(this.acceptReturn(maximum),maximum);
    this.endpoint += amount; return amount;
  }
  private withdraw(energy: number): number { const amount = Math.min(energy,this.endpoint); this.endpoint -= amount; return amount; }
  private lose(energy: number): void {
    const flow: StartupCashFlow = { id: 'household-loss:'+this.losses.length,kind: 'upkeep',energy,firstTick: this.tick,interval: null,occurrences: 1 };
    this.timeline.loseHousehold(flow); this.losses.push(flow);
  }
}

function initialHousehold(input: StartupHouseholdInput, checkpoint?: StartupHouseholdCheckpoint) {
  if (checkpoint !== undefined) return readHouseholdCheckpoint(input,checkpoint);
  return { endpointEnergy: input.endpointEnergy,endpointSpentEnergy: 0,endpointReceivedEnergy: 0,through: -1,losses: [] as StartupCashFlow[],spawning: undefined,redistribution: undefined,labor: undefined };
}
