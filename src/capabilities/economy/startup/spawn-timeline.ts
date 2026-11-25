import { startupExpenseTotals } from './cash-expenses';
import { copyPlain } from '../../../core/plain-data';
import { restoreTimelineCheckpoint } from './checkpoints/timeline';
import { snapshotStartupSpawns } from './snapshot';
import { admitStartupSpawns } from './spawn-admission';
import { createStartupEnergyLedger } from './energy/ledger';
import { validateEnergyFundingCheckpoint } from './energy/funding-checkpoint';
import { createStartupSpawnFunding } from './spawn-funding';
import { createStartupCashLedger } from './cash-ledger';
import { validateStartupReceipt } from './cash-receipts';
import { startupFlowDue } from './flow';
import { validateStartupSpawns } from './spawn-validation';
import type { SpawnAssignment } from '../../spawning/request';
import type { StartupCashFlow, StartupCashReceipt } from './cash-model';
import type { StartupSpawnInput, StartupScheduledBirth, StartupSpawnForecast } from './spawn-model';
/** Explicit forward frame phases; no future receipt can alter an earlier admission. */
export function createStartupSpawnTimeline(input: StartupSpawnInput, checkpoint?: unknown) { return new StartupSpawnTimeline(input,checkpoint); }
class StartupSpawnTimeline {
  private readonly input: StartupSpawnInput;
  private readonly slots: StartupSpawnInput['spawns'][number][];
  private readonly pending;
  private readonly funding;
  private readonly energy;
  private readonly passive: boolean;
  private ambientEnergy = 0;
  private outsideExpense = 0;
  private readonly births: StartupScheduledBirth[] = [];
  private readonly flows: StartupCashFlow[];
  private receiptCount = 0;
  private frame: StartupCashFlow[] = [];
  private readonly accounting;
  private readonly receiptIds: Set<string>;
  private tick = 0;
  private open = false;
  constructor(input: StartupSpawnInput, checkpoint?: unknown) {
    validateStartupSpawns(input);
    this.input = snapshotStartupSpawns(input);
    this.passive = !!this.input.funding.energyLayout?.regeneration;
    const saved = checkpoint === undefined ? undefined : restoreTimelineCheckpoint(this.input,checkpoint);
    this.slots = input.spawns.map(spawn => ({ ...spawn }));
    this.pending = new Map(this.input.requests.map(request => [request.id,request]));
    this.funding = createStartupSpawnFunding(this.input.funding,input.cash.homeEnergy,saved?.funding);
    this.energy = this.input.funding.energyLayout ? createStartupEnergyLedger(this.input.funding.energyLayout,saved?.energy) : undefined;
    if (saved && this.energy) validateEnergyFundingCheckpoint(this.input,saved,this.energy.result());
    this.flows = this.input.cash.flows.map(flow => ({ ...flow }));
    this.accounting = createStartupCashLedger(this.input.cash,saved?.accounting,{ ambient: this.passive });
    this.receiptIds = new Set([...this.flows.map(flow => flow.id),...input.requests.map(request => 'birth:'+request.id)]);
    if (saved) this.resume(saved);
  }
  private resume(saved: ReturnType<typeof restoreTimelineCheckpoint>): void {
    this.slots.splice(0,this.slots.length,...saved.slots); this.births.push(...saved.births);
    for (const birth of this.births) this.pending.delete(birth.request);
    this.flows.push(...this.births.map(birthFlow)); this.receiptIds.clear();
    for (const id of saved.receiptIds) this.receiptIds.add(id);
    this.tick = saved.tick; this.receiptCount = saved.receiptCount;
    this.outsideExpense = startupExpenseTotals(this.external(saved.tick-1)).outside;
    this.ambientEnergy = this.passive ? saved.energy!.events.filter(event => event.kind === 'ambient' && event.tick === saved.tick-1).reduce((sum,event) => sum+event.energy,0) : 0;
    if (this.funding.checkpoint().bank !== saved.accounting.state.endingEnergy || saved.accounting.state.birthEnergy !== this.births.reduce((sum,birth) => sum+birth.cost,0)) throw new Error('Invalid startup checkpoint funding/accounting');
  }

  checkpoint() {
    if (this.open) throw new Error('Cannot checkpoint an open startup spawn frame');
    return copyPlain({ tick: this.tick,slots: this.slots,births: this.births,receiptCount: this.receiptCount,receiptIds: [...this.receiptIds],funding: this.funding.checkpoint(),...(this.energy ? { energy: this.energy.checkpoint() } : {}),accounting: this.accounting.checkpoint() });
  }
  begin(tick: number): StartupScheduledBirth[] {
    if (this.open || tick !== this.tick || tick > this.input.cash.horizon) throw new Error('Startup spawn frame order');
    const frame = this.external(tick), expenses = startupExpenseTotals(frame);
    this.validateExpenses(expenses);
    this.frame = frame; this.ambientEnergy = 0; this.outsideExpense = expenses.outside;
    if (expenses.outside) this.funding.spendOutside(expenses.outside);
    this.funding.spend(expenses.unlocated);
    const slots = this.slots.map(spawn => ({ id: spawn.id,room: spawn.room,busy: spawn.availableAt > tick }));
    const allocated = admitStartupSpawns({ ...this.input,requests: [...this.pending.values()] },slots,tick,{
      available: () => this.funding.available(this.input.cash.protectedEnergy),charge: allocation => this.charge(allocation,tick),
    });
    const births = allocated.map(allocation => this.commit(allocation,tick)); this.open = true;
    return births;
  }
  finish(receipts: readonly StartupCashReceipt[] = [], beforeAccounting: () => void = () => {}): StartupCashFlow[] {
    if (!this.open) throw new Error('Startup spawn frame not open');
    const credited = this.accept(receipts);
    beforeAccounting();
    this.ambientEnergy = this.passive ? this.energy!.regenerate(this.tick) : 0;
    if (this.passive) this.funding.ambient(this.ambientEnergy);
    this.accounting.frame(this.tick,this.frame,credited,true,0,this.ambientEnergy);
    this.funding.refill(this.tick);
    this.funding.receive(credited+this.external(this.tick).filter(flow => flow.kind === 'delivery').reduce((sum,flow) => sum+flow.energy,0));
    this.open = false; this.tick++; return this.frame.map(flow => ({ ...flow }));
  }
  frameOutsideExpense(): number { return this.outsideExpense; }
  frameAmbientEnergy(): number { return this.ambientEnergy; }
  fundingState() { return this.funding.checkpoint(); }
  transferHousehold(energy: number, destination?: string, holder?: string): number {
    if (!this.open) throw new Error('Household transfer outside action frame');
    if (!Number.isSafeInteger(energy) || energy < 0) throw new Error('Invalid household funding transfer');
    if (!this.energy) return this.funding.transfer(energy);
    if (!destination || !holder) throw new Error('Structure transfer needs destination and holder');
    const state = this.funding.checkpoint();
    const maximum = Math.max(0,Math.min(energy,this.input.funding.capacity-state.accessible,state.bank-this.energy.stock()));
    return this.funding.transfer(this.energy.deposit(destination,maximum,this.tick,holder));
  }
  loseHousehold(flow: StartupCashFlow): void {
    if (!this.open || flow.kind !== 'upkeep' || flow.firstTick !== this.tick || flow.interval !== null || flow.occurrences !== 1) throw new Error('Invalid household loss frame');
    if (this.energy && flow.energy > this.funding.checkpoint().bank-this.energy.stock()) throw new Error('Physical cargo loss exceeds outside stock');
    this.funding.lose(flow.energy); this.frame.push({ ...flow });
  }
  frameFlows(): StartupCashFlow[] {
    if (!this.open) throw new Error('Startup spawn frame not open');
    return this.frame.map(flow => ({ ...flow }));
  }
  result(): StartupSpawnForecast {
    if (this.open || this.tick !== this.input.cash.horizon+1) throw new Error('Startup spawn timeline incomplete');
    const unscheduled = [...this.pending.values()].map(request => ({ request: request.id,reason: this.reason(request.name,request.expiresAt) }));
    return { births: this.births.map(birth => ({ ...birth })),unscheduled,flows: this.flows.map(flow => ({ ...flow })),funding: this.funding.result(),
      cash: this.accounting.result() };
  }
  private validateExpenses(expenses: ReturnType<typeof startupExpenseTotals>): void {
    const bank = this.funding.checkpoint().bank, stock = this.energy?.stock() ?? 0;
    if (expenses.outside > Math.max(0,bank-stock)) throw new Error('Unfunded outside expense');
    if (this.passive && expenses.unlocated > bank-expenses.outside) throw new Error('Unfunded passive startup expenses');
    if (this.passive && expenses.unlocated > 0) throw new Error('Unlocated passive startup expense');
  }
  private charge(allocation: SpawnAssignment, tick: number): boolean {
    if (this.energy && !this.energy.charge(allocation.spawn,allocation.cost,tick,allocation.request.id)) return false;
    this.funding.spend(allocation.cost); return true;
  }
  private commit(allocation: SpawnAssignment, tick: number): StartupScheduledBirth {
    const activeAt = tick+allocation.request.body.length*3;
    const birth = { request: allocation.request.id,spawn: allocation.spawn,startAt: tick,activeAt,cost: allocation.cost };
    const flow = birthFlow(birth);
    this.births.push(birth); this.flows.push(flow); this.frame.push(flow);
    this.slots.find(spawn => spawn.id === allocation.spawn)!.availableAt = activeAt;
    this.pending.delete(birth.request);
    return { ...birth };
  }
  private accept(receipts: readonly StartupCashReceipt[]): number {
    if (this.receiptCount+receipts.length > 160016) throw new Error('Startup receipt event capacity');
    const ids = new Set<string>();
    for (const receipt of receipts) {
      validateStartupReceipt(receipt,this.tick,this.receiptIds);
      if (receipt.tick !== this.tick || ids.has(receipt.id)) throw new Error('Invalid startup receipt frame/identity');
      ids.add(receipt.id);
    }
    for (const receipt of receipts) { this.receiptIds.add(receipt.id); this.receiptCount++; }
    return receipts.reduce((sum,receipt) => sum+receipt.energy,0);
  }
  private external(tick: number) { return this.input.cash.flows.filter(flow => startupFlowDue(flow,tick)); }
  private reason(name: string, expiresAt: number): 'live-name' | 'expired' | 'horizon' {
    if (this.input.liveNames.has(name)) return 'live-name';
    return expiresAt <= this.input.cash.horizon ? 'expired' : 'horizon';
  }
}

function birthFlow(birth: StartupScheduledBirth): StartupCashFlow {
  return { id: 'birth:'+birth.request,kind: 'birth',energy: birth.cost,firstTick: birth.startAt,interval: null,occurrences: 1 };
}
