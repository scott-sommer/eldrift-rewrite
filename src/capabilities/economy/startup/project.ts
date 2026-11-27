import { validateSharedCommitments } from './shared-validation';
import { startupProjectFormat } from './checkpoints/project-format';
import { createStartupOpeningStock } from './opening-stock';
import { startupProjectWaves, startupProjectCouriers, startupOpeningEnergy } from './initial';
import { readStartupProjectCheckpoint, boundedProjectCheckpoint } from './checkpoints/project';
import { startupProjectIdentity } from './checkpoints/project-identity';
import type { StartupProjectCheckpoint, StartupProjectReceipt } from './checkpoints/project-model';
import type { StartupScheduledBirth } from './spawn-model';
import { createStartupProjectTimeline } from './project-timeline';
import { initialStartupConstruction } from './construction';
import { initialStartupDelivery } from './delivery';
import { startupDeliveryCouriers, advanceStartupCouriers } from './delivery-couriers';
import { startupMiningFrame } from './delivery-mining';
import { advanceStartupBuilding } from './project-building';
import { createStartupContainer } from './container';
import { createStartupSink } from './sink';
import { advanceStartupSource } from './source';
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
  private readonly container;
  private readonly sink;
  private readonly construction;
  private readonly delivery;
  private readonly births: StartupScheduledBirth[] = [];
  private readonly couriers: StartupCourierState[] = [];
  private readonly due = new Map<number,StartupProjectReceipt[]>();
  private readonly settled: StartupDeliveryForecast['receipts'] = [];
  private readonly houseAccounting;
  private readonly sourceAccounting;
  private readonly opening;
  private waves: StartupBuildWave[] = [];
  private previousMiner: string | undefined;
  private tick = 0;
  constructor(input: StartupDeliveryInput, checkpoint?: unknown) {
    if (!Number.isSafeInteger(input.containerCapacity) || input.containerCapacity < 1 || input.containerCapacity > 1000000) throw new Error('Invalid startup container capacity');
    validateSharedCommitments(input);
    this.input = snapshotStartupProject(input);
    const saved = checkpoint === undefined ? undefined : readStartupProjectCheckpoint(this.input,checkpoint);
    const cashOptions = { ambient: !!this.input.project.spawning.funding.energyLayout?.regeneration };
    this.houseAccounting = createStartupCashLedger(this.input.project.spawning.cash,saved?.houseAccounting,cashOptions); this.sourceAccounting = createStartupCashLedger(this.input.project.spawning.cash,saved?.sourceAccounting,cashOptions);
    this.timeline = createStartupProjectTimeline(this.input,saved);
    this.container = createStartupContainer(this.input.container,saved?.container); this.sink = createStartupSink(this.input.homeSink,this.input.project.spawning.cash,saved?.sink);
    this.construction = saved?.construction ?? initialStartupConstruction(this.input.project); this.delivery = saved?.delivery ?? initialStartupDelivery(this.construction);
    this.opening = createStartupOpeningStock(this.input,this.delivery,saved?.opening);
    this.waves = startupProjectWaves(this.input,[]); startupDeliveryCouriers(this.input,[]);
    if (saved) this.resume(saved); else this.seed();
  }
  private seed(): void {
    this.delivery.containerEnergy = this.input.initial?.containerEnergy ?? 0;
    this.couriers.push(...startupProjectCouriers(this.input,[]));
  }
  birth(request: string): StartupScheduledBirth | undefined {
    const birth = this.births.find(item => item.request === request); return birth ? { ...birth } : undefined;
  }
  checkpoint(): StartupProjectCheckpoint {
    return boundedProjectCheckpoint({ format: startupProjectFormat(this.input),binding: startupProjectIdentity(this.input),tick: this.tick,
      ...this.timeline.checkpoint(),container: this.container.checkpoint(),sink: this.sink.checkpoint(),
      construction: this.construction,delivery: this.delivery,opening: this.opening.checkpoint(),
      couriers: this.couriers.map(worker => ({ ...worker,nextAt: worker.nextAt === Infinity ? null : worker.nextAt })),
      due: [...this.due.values()].flat(),settled: this.settled,houseAccounting: this.houseAccounting.checkpoint(),sourceAccounting: this.sourceAccounting.checkpoint() });
  }
  private resume(saved: StartupProjectCheckpoint): void {
    this.tick = saved.tick; this.births.push(...saved.timeline.births);
    this.waves = startupProjectWaves(this.input,this.births);
    this.previousMiner = this.waves.find(wave => wave.startAt <= this.tick-1 && this.tick-1 < wave.endAt)?.request;
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
    const construction = { ...this.construction,source: { ...this.construction.source },waves: this.construction.waves.map(wave => ({ ...wave,work: { ...wave.work } })),unusedCargoEnergy: this.construction.unusedCargoEnergy+(this.construction.completeAt === null ? this.delivery.minerCargoEnergy : 0) };
    const delivery = { ...this.delivery,source: { ...this.delivery.source },projectedThrough: this.tick,courierCargoEnergy: this.couriers.reduce((sum,worker) => sum+worker.cargo,0),receipts: this.settled.map(receipt => ({ ...receipt })) };
    return { ...(this.input.initial ? { openingAssets: { energy: startupOpeningEnergy(this.input),...this.opening.checkpoint() } } : {}),spawning,construction,delivery,homeSink: this.sink.result(),maintenance: this.container.result(),
      cash: this.houseAccounting.result(),projectCash: this.sourceAccounting.result() };
  }
  private step(): void {
    this.recruit(); this.sink.prepare(this.tick);
    const building = this.construction.completeAt === null;
    const wave = this.waves.find(wave => wave.startAt <= this.tick && this.tick < wave.endAt);
    this.switchMiner(wave?.request,building); this.opening.activate(wave?.request,this.tick);
    let deposit = 0;
    if (building && wave) this.build(wave);
    else deposit = this.station(wave);
    advanceStartupCouriers(this.couriers,this.delivery,this.tick,this.input.project.spawning.cash.horizon,this.sink);
    this.sink.finish(); this.delivery.containerEnergy += deposit;
    if (!building && !this.container.finish(this.tick,this.delivery.containerEnergy)) this.delivery.containerEnergy = 0;
    if (!(building && wave)) this.regenerate(building);
    if (building) { this.construction.source = { ...this.delivery.source }; this.construction.projectedThrough = this.tick+1; }
    this.queueReceipts(); this.account(); this.tick++;
  }
  private build(wave: StartupBuildWave): void {
    const before = this.construction.constructionEnergy;
    advanceStartupBuilding(this.construction,this.delivery,wave,this.tick);
    this.opening.built(wave.request,this.construction.constructionEnergy-before);
  }
  private recruit(): void {
    const births = this.timeline.begin(this.tick);
    if (!births.length) return;
    this.births.push(...births); this.waves = startupProjectWaves(this.input,this.births);
    this.couriers.push(...startupDeliveryCouriers(this.input,births)); this.couriers.sort((a,b) => a.request.localeCompare(b.request));
  }
  private switchMiner(next: string | undefined, building: boolean): void {
    if (next === this.previousMiner) return;
    this.opening.leave(this.previousMiner);
    if (building) this.construction.unusedCargoEnergy += this.delivery.minerCargoEnergy;
    this.delivery.unusedMinerCargoEnergy += this.delivery.minerCargoEnergy; this.delivery.minerCargoEnergy = 0; this.previousMiner = next;
  }
  private station(wave: StartupBuildWave | undefined): number {
    if (this.construction.completeAt === null) return 0;
    const before = this.delivery.minerCargoEnergy;
    const deposit = startupMiningFrame(this.delivery,wave,this.tick,this.input.containerCapacity,this.container);
    this.opening.spent(wave?.request,before,this.delivery.minerCargoEnergy); return deposit;
  }
  private regenerate(building: boolean): void {
    const amount = advanceStartupSource(this.delivery.source,1);
    if (building) this.construction.regeneratedEnergy += amount;
    else this.delivery.regeneratedEnergy += amount;
  }
  private queueReceipts(): void {
    for (const receipt of this.delivery.receipts) {
      const records = this.due.get(receipt.tick) ?? [];
      records.push({ ...receipt,id: 'remote-delivery:'+receipt.request+':'+receipt.tick }); this.due.set(receipt.tick,records);
    }
    this.delivery.receipts = [];
  }
  private account(): void {
    const receipts = this.due.get(this.tick) ?? []; receipts.sort((a,b) => a.request.localeCompare(b.request));
    const credit = receipts.reduce((sum,receipt) => sum+receipt.energy,0), settlement = this.timeline.finish(receipts,(energy: number) => this.sink.occupyAfterFrame(energy)), flows = settlement.flows;
    this.sink.releaseAfterFrame(settlement.picked+settlement.spent);
    const ready = this.construction.completeAt !== null && this.construction.completeAt <= this.tick;
    this.houseAccounting.frame(this.tick,flows,credit,ready,this.opening.constructionCredit(),settlement.ambientEnergy); this.sourceAccounting.frame(this.tick,flows.filter(flow => flow.kind !== 'delivery'),credit,ready,this.opening.constructionCredit(),settlement.ambientEnergy);
    this.due.delete(this.tick);
    this.settled.push(...receipts.map(({ tick,energy,request }) => ({ tick,energy,request })));
  }
}
