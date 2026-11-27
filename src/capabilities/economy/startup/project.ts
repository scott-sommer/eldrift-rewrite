import { StartupProjectSource } from './project-source';
import { createStartupProjectMotion } from './courier-trips/project';
import { validateSharedCommitments } from './shared-validation';
import { startupProjectFormat } from './checkpoints/project-format';
import { startupProjectWaves, startupProjectCouriers, startupOpeningEnergy } from './initial';
import { readStartupProjectCheckpoint, boundedProjectCheckpoint } from './checkpoints/project';
import { startupProjectIdentity } from './checkpoints/project-identity';
import type { StartupProjectCheckpoint, StartupProjectReceipt } from './checkpoints/project-model';
import type { StartupScheduledBirth } from './spawn-model';
import { createStartupProjectTimeline } from './project-timeline';
import { startupDeliveryCouriers, advanceStartupCouriers } from './delivery-couriers';
import { createStartupSink } from './sink';
import { createStartupCashLedger } from './cash-ledger';
import { snapshotStartupProject } from './snapshot';
import type { StartupDeliveryInput, StartupCourierState, StartupDeliveryForecast } from './delivery-model';
import type { StartupBuildWave } from './construction-model';

/** Single forward timeline; caller-supplied refills can redistribute earnings only after they settle. */
export function forecastStartupProject(input: StartupDeliveryInput) {
  const project = createStartupProject(input); project.advance(input.project.spawning.cash.horizon+1); return project.result();
}
export function createStartupProject(input: StartupDeliveryInput) { return new StartupProject(input); }
export function restoreStartupProject(input: StartupDeliveryInput, checkpoint: unknown) { return new StartupProject(input,checkpoint); }
class StartupProject {
  private readonly input;
  private readonly timeline;
  private readonly source;
  private readonly sink;
  private readonly births: StartupScheduledBirth[] = [];
  private readonly couriers: StartupCourierState[] = [];
  private readonly due = new Map<number,StartupProjectReceipt[]>();
  private readonly settled: StartupDeliveryForecast['receipts'] = [];
  private readonly houseAccounting;
  private readonly sourceAccounting;
  private readonly motion;
  private waves: StartupBuildWave[] = [];
  private tick = 0;
  constructor(input: StartupDeliveryInput, checkpoint?: unknown) {
    if (!Number.isSafeInteger(input.containerCapacity) || input.containerCapacity < 1 || input.containerCapacity > 1000000) throw new Error('Invalid startup container capacity');
    validateSharedCommitments(input);
    this.input = snapshotStartupProject(input);
    const saved = checkpoint === undefined ? undefined : readStartupProjectCheckpoint(this.input,checkpoint);
    const cashOptions = { ambient: !!this.input.project.spawning.funding.energyLayout?.regeneration };
    this.houseAccounting = createStartupCashLedger(this.input.project.spawning.cash,saved?.houseAccounting,cashOptions); this.sourceAccounting = createStartupCashLedger(this.input.project.spawning.cash,saved?.sourceAccounting,cashOptions);
    this.timeline = createStartupProjectTimeline(this.input,saved);
    this.source = new StartupProjectSource(this.input,saved); this.sink = createStartupSink(this.input.homeSink,this.input.project.spawning.cash,saved?.sink);
    this.waves = startupProjectWaves(this.input,[]); startupDeliveryCouriers(this.input,[]);
    if (saved) this.resume(saved); else this.seed();
    this.motion = this.createMotion(saved);
  }
  private createMotion(saved: StartupProjectCheckpoint | undefined) {
    return this.input.motion ? createStartupProjectMotion(this.input,saved?.motion,this.couriers,this.births,this.tick) : undefined;
  }
  private seed(): void {
    this.couriers.push(...startupProjectCouriers(this.input,[]));
  }
  birth(request: string): StartupScheduledBirth | undefined {
    const birth = this.births.find(item => item.request === request); return birth ? { ...birth } : undefined;
  }
  checkpoint(): StartupProjectCheckpoint {
    return boundedProjectCheckpoint({ format: startupProjectFormat(this.input),binding: startupProjectIdentity(this.input),tick: this.tick,
      ...this.timeline.checkpoint(),...(this.motion ? { motion: this.motion.checkpoint() } : {}),container: this.source.container.checkpoint(),sink: this.sink.checkpoint(),
      construction: this.source.construction,delivery: this.source.delivery,opening: this.source.opening.checkpoint(),
      couriers: this.couriers.map(worker => ({ ...worker,nextAt: worker.nextAt === Infinity ? null : worker.nextAt })),
      due: [...this.due.values()].flat(),settled: this.settled,houseAccounting: this.houseAccounting.checkpoint(),sourceAccounting: this.sourceAccounting.checkpoint() });
  }
  private resume(saved: StartupProjectCheckpoint): void {
    this.tick = saved.tick; this.births.push(...saved.timeline.births);
    this.waves = startupProjectWaves(this.input,this.births);
    this.couriers.push(...saved.couriers.map(worker => ({ ...worker,nextAt: worker.nextAt ?? Infinity })));
    this.settled.push(...saved.settled);
    for (const receipt of saved.due) {
      const records = this.due.get(receipt.tick) ?? []; records.push(receipt); this.due.set(receipt.tick,records);
    }
  }
  advance(maximumFrames: number, guard: () => boolean = () => true) {
    if (!Number.isSafeInteger(maximumFrames) || maximumFrames < 0 || maximumFrames > 10001) throw new Error('Invalid startup project frame budget');
    let frames = 0;
    while (this.tick <= this.input.project.spawning.cash.horizon && frames < maximumFrames && guard()) { this.step(); frames++; }
    return { frames,through: this.tick,accountedThrough: this.houseAccounting.through(),done: this.tick > this.input.project.spawning.cash.horizon };
  }
  result() {
    const spawning = this.timeline.result();
    const { construction,delivery } = this.source.result(this.tick,this.couriers.reduce((sum,worker) => sum+worker.cargo,0),this.settled);
    return { ...(this.input.initial ? { openingAssets: { energy: startupOpeningEnergy(this.input),...this.source.opening.checkpoint() } } : {}),spawning,construction,delivery,homeSink: this.sink.result(),maintenance: this.source.container.result(),
      cash: this.houseAccounting.result(),projectCash: this.sourceAccounting.result() };
  }
  private step(): void {
    this.recruit(); this.sink.prepare(this.tick);
    const wave = this.waves.find(wave => wave.startAt <= this.tick && this.tick < wave.endAt);
    const frame = this.source.prepare(this.tick,wave);
    this.deliver(); this.sink.finish(); frame.finish();
    this.queueReceipts(); this.account(); this.tick++;
  }
  private deliver(): void {
    const service = (ready?: (worker: StartupCourierState,tick: number) => boolean) => advanceStartupCouriers(this.couriers,this.source.delivery,this.tick,this.input.project.spawning.cash.horizon,this.sink,ready);
    if (this.motion) this.motion.advance(this.couriers,this.births,this.tick,service);
    else service();
  }
  private recruit(): void {
    const births = this.timeline.begin(this.tick);
    if (!births.length) return;
    this.births.push(...births); this.waves = startupProjectWaves(this.input,this.births);
    this.couriers.push(...startupDeliveryCouriers(this.input,births)); this.couriers.sort((a,b) => a.request.localeCompare(b.request));
  }
  private queueReceipts(): void {
    for (const receipt of this.source.delivery.receipts) {
      const records = this.due.get(receipt.tick) ?? [];
      records.push({ ...receipt,id: 'remote-delivery:'+receipt.request+':'+receipt.tick }); this.due.set(receipt.tick,records);
    }
    this.source.delivery.receipts = [];
  }
  private account(): void {
    const receipts = this.due.get(this.tick) ?? []; receipts.sort((a,b) => a.request.localeCompare(b.request));
    const credit = receipts.reduce((sum,receipt) => sum+receipt.energy,0), settlement = this.timeline.finish(receipts,(energy: number) => this.sink.occupyAfterFrame(energy)), flows = settlement.flows;
    this.sink.releaseAfterFrame(settlement.picked+settlement.spent);
    const ready = this.source.construction.completeAt !== null && this.source.construction.completeAt <= this.tick;
    this.houseAccounting.frame(this.tick,flows,credit,ready,this.source.opening.constructionCredit(),settlement.ambientEnergy); this.sourceAccounting.frame(this.tick,flows.filter(flow => flow.kind !== 'delivery'),credit,ready,this.source.opening.constructionCredit(),settlement.ambientEnergy);
    this.due.delete(this.tick);
    this.settled.push(...receipts.map(({ tick,energy,request }) => ({ tick,energy,request })));
  }
}
