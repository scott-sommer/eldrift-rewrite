import { copyPlain } from '../../../core/plain-data';
import { restoreTimelineCheckpoint } from './checkpoints/timeline';
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
export function createStartupSpawnTimeline(input: StartupSpawnInput, checkpoint?: unknown) { return new StartupSpawnTimeline(input,checkpoint); }
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
  constructor(input: StartupSpawnInput, checkpoint?: unknown) {
    validateStartupSpawns(input);
    this.input = snapshotStartupSpawns(input);
    const saved = checkpoint === undefined ? undefined : restoreTimelineCheckpoint(this.input,checkpoint);
    this.slots = input.spawns.map(spawn => ({ ...spawn }));
    this.pending = new Map(this.input.requests.map(request => [request.id,request]));
    this.funding = createStartupSpawnFunding(this.input.funding,input.cash.homeEnergy,saved?.funding);
    this.flows = this.input.cash.flows.map(flow => ({ ...flow }));
    this.accounting = createStartupCashLedger(this.input.cash,saved?.accounting);
    this.receiptIds = new Set([...this.flows.map(flow => flow.id),...input.requests.map(request => 'birth:'+request.id)]);
    if (saved) this.resume(saved);
  }
  private resume(saved: ReturnType<typeof restoreTimelineCheckpoint>): void {
    this.slots.splice(0,this.slots.length,...saved.slots); this.births.push(...saved.births);
    for (const birth of this.births) this.pending.delete(birth.request);
    this.flows.push(...this.births.map(birthFlow)); this.receiptIds.clear();
    for (const id of saved.receiptIds) this.receiptIds.add(id);
    this.tick = saved.tick; this.receiptCount = saved.receiptCount;
    if (this.funding.checkpoint().bank !== saved.accounting.state.endingEnergy || saved.accounting.state.birthEnergy !== this.births.reduce((sum,birth) => sum+birth.cost,0)) throw new Error('Invalid startup checkpoint funding/accounting');
  }

  checkpoint() {
    if (this.open) throw new Error('Cannot checkpoint an open startup spawn frame');
    return copyPlain({ tick: this.tick,slots: this.slots,births: this.births,receiptCount: this.receiptCount,receiptIds: [...this.receiptIds],funding: this.funding.checkpoint(),accounting: this.accounting.checkpoint() });
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
  finish(receipts: readonly StartupCashReceipt[] = [], beforeAccounting: () => void = () => {}): StartupCashFlow[] {
    if (!this.open) throw new Error('Startup spawn frame not open');
    const credited = this.accept(receipts);
    beforeAccounting();
    this.accounting.frame(this.tick,this.frame,credited);
    this.funding.refill(this.tick);
    this.funding.receive(credited+this.external(this.tick).filter(flow => flow.kind === 'delivery').reduce((sum,flow) => sum+flow.energy,0));
    this.open = false; this.tick++; return this.frame.map(flow => ({ ...flow }));
  }
  transferHousehold(energy: number): number {
    if (!this.open) throw new Error('Household transfer outside action frame');
    return this.funding.transfer(energy);
  }
  loseHousehold(flow: StartupCashFlow): void {
    if (!this.open || flow.kind !== 'upkeep' || flow.firstTick !== this.tick || flow.interval !== null || flow.occurrences !== 1) throw new Error('Invalid household loss frame');
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
  private commit(allocation: SpawnAssignment, tick: number): StartupScheduledBirth {
    const activeAt = tick+allocation.request.body.length*3;
    const birth = { request: allocation.request.id,spawn: allocation.spawn,startAt: tick,activeAt,cost: allocation.cost };
    const flow = birthFlow(birth);
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

function birthFlow(birth: StartupScheduledBirth): StartupCashFlow {
  return { id: 'birth:'+birth.request,kind: 'birth',energy: birth.cost,firstTick: birth.startAt,interval: null,occurrences: 1 };
}
