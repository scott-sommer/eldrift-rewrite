import { snapshotStartupSpawns } from './snapshot';
import { allocateSpawns } from '../../spawning/allocate';
import { createStartupSpawnFunding } from './spawn-funding';
import { createStartupCashLedger } from './cash-ledger';
import { validateStartupReceipt } from './cash-receipts';
import { startupFlowDue } from './flow';
import { validateStartupSpawns } from './spawn-validation';
import type { SpawnAssignment } from '../../spawning/request';
import type { StartupCashFlow, StartupCashReceipt } from './cash-model';
import type { StartupSpawnInput, StartupScheduledBirth, StartupSpawnForecast } from './spawn-model';
/** Explicit forward frame phases; no future receipt can alter an earlier admission. */
export function createStartupSpawnTimeline(input: StartupSpawnInput) { return new StartupSpawnTimeline(input); }
class StartupSpawnTimeline {
  private readonly input: StartupSpawnInput;
  private readonly slots: StartupSpawnInput['spawns'][number][];
  private readonly pending;
  private readonly funding;
  private readonly births: StartupScheduledBirth[] = [];
  private readonly flows: StartupCashFlow[];
  private receiptCount = 0;
  private frame: StartupCashFlow[] = [];
  private readonly accounting;
  private readonly receiptIds: Set<string>;
  private tick = 0;
  private open = false;
  constructor(input: StartupSpawnInput) {
    validateStartupSpawns(input);
    this.input = snapshotStartupSpawns(input);
    this.slots = input.spawns.map(spawn => ({ ...spawn }));
    this.pending = new Map(this.input.requests.map(request => [request.id,request]));
    this.funding = createStartupSpawnFunding(this.input.funding,input.cash.homeEnergy);
    this.flows = this.input.cash.flows.map(flow => ({ ...flow }));
    this.accounting = createStartupCashLedger(this.input.cash);
    this.receiptIds = new Set([...this.flows.map(flow => flow.id),...input.requests.map(request => 'birth:'+request.id)]);
  }
  begin(tick: number): StartupScheduledBirth[] {
    if (this.open || tick !== this.tick || tick > this.input.cash.horizon) throw new Error('Startup spawn frame order');
    this.frame = this.external(tick);
    this.funding.spend(this.frame.filter(flow => flow.kind !== 'delivery').reduce((sum,flow) => sum+flow.energy,0));
    const slots = this.slots.map(spawn => ({ id: spawn.id,room: spawn.room,busy: spawn.availableAt > tick }));
    const allocated = allocateSpawns([...this.pending.values()],slots,{ [this.input.room]: this.funding.available(this.input.cash.protectedEnergy) },this.input.liveNames,tick,this.input.unaffordable);
    const births = allocated.map(allocation => this.commit(allocation,tick)); this.open = true;
    return births;
  }
  finish(receipts: readonly StartupCashReceipt[] = []): void {
    if (!this.open) throw new Error('Startup spawn frame not open');
    const credited = this.accept(receipts);
    this.accounting.frame(this.tick,this.frame,credited);
    this.funding.refill(this.tick);
    this.funding.receive(credited+this.external(this.tick).filter(flow => flow.kind === 'delivery').reduce((sum,flow) => sum+flow.energy,0));
    this.open = false; this.tick++;
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
  private commit(allocation: SpawnAssignment, tick: number): StartupScheduledBirth {
    const activeAt = tick+allocation.request.body.length*3;
    const birth = { request: allocation.request.id,spawn: allocation.spawn,startAt: tick,activeAt,cost: allocation.cost };
    const flow: StartupCashFlow = { id: 'birth:'+birth.request,kind: 'birth',energy: birth.cost,firstTick: tick,interval: null,occurrences: 1 };
    this.births.push(birth); this.flows.push(flow); this.frame.push(flow);
    this.slots.find(spawn => spawn.id === allocation.spawn)!.availableAt = activeAt;
    this.pending.delete(birth.request); this.funding.spend(birth.cost);
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
