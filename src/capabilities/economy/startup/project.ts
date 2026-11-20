import type { StartupScheduledBirth } from './spawn-model';
import { createStartupSpawnTimeline } from './spawn-timeline';
import { initialStartupConstruction } from './construction';
import { initialStartupDelivery } from './delivery';
import { startupConstructionWaves } from './construction-workers';
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
import type { StartupCashReceipt } from './cash-model';
/** Single forward timeline; caller-supplied refills can redistribute earnings only after they settle. */
export function forecastStartupProject(input: StartupDeliveryInput) {
  const project = createStartupProject(input); project.advance(input.project.spawning.cash.horizon+1); return project.result();
}
export function createStartupProject(input: StartupDeliveryInput) { return new StartupProject(input); }
interface ProjectReceipt extends StartupCashReceipt { request: string }
class StartupProject {
  private readonly input;
  private readonly timeline;
  private readonly container;
  private readonly sink;
  private readonly construction;
  private readonly delivery;
  private readonly births: StartupScheduledBirth[] = [];
  private readonly couriers: StartupCourierState[] = [];
  private readonly due = new Map<number,ProjectReceipt[]>();
  private readonly settled: StartupDeliveryForecast['receipts'] = [];
  private readonly houseAccounting;
  private readonly sourceAccounting;
  private waves: StartupBuildWave[] = [];
  private previousMiner: string | undefined;
  private tick = 0;
  constructor(input: StartupDeliveryInput) {
    if (!Number.isSafeInteger(input.containerCapacity) || input.containerCapacity < 1 || input.containerCapacity > 1000000) throw new Error('Invalid startup container capacity');
    this.input = snapshotStartupProject(input);
    this.houseAccounting = createStartupCashLedger(this.input.project.spawning.cash); this.sourceAccounting = createStartupCashLedger(this.input.project.spawning.cash);
    this.timeline = createStartupSpawnTimeline(this.input.project.spawning);
    this.container = createStartupContainer(this.input.container); this.sink = createStartupSink(this.input.homeSink,this.input.project.spawning.cash);
    this.construction = initialStartupConstruction(this.input.project); this.delivery = initialStartupDelivery(this.construction);
    startupConstructionWaves(this.input.project,[]); startupDeliveryCouriers(this.input,[]);
  }
  advance(maximumFrames: number, guard: () => boolean = () => true) {
    if (!Number.isSafeInteger(maximumFrames) || maximumFrames < 0 || maximumFrames > 10001) throw new Error('Invalid startup project frame budget');
    let frames = 0;
    while (this.tick <= this.input.project.spawning.cash.horizon && frames < maximumFrames && guard()) { this.step(); frames++; }
    return { frames,through: this.tick,accountedThrough: this.houseAccounting.through(),done: this.tick > this.input.project.spawning.cash.horizon };
  }
  result() {
    const spawning = this.timeline.result();
    const construction = { ...this.construction,unusedCargoEnergy: this.construction.unusedCargoEnergy+(this.construction.completeAt === null ? this.delivery.minerCargoEnergy : 0) };
    this.delivery.projectedThrough = this.tick;
    this.delivery.courierCargoEnergy = this.couriers.reduce((sum,worker) => sum+worker.cargo,0);
    const delivery = { ...this.delivery,receipts: this.settled };
    return { spawning,construction,delivery,homeSink: this.sink.result(),maintenance: this.container.result(),
      cash: this.houseAccounting.result(),projectCash: this.sourceAccounting.result() };
  }
  private step(): void {
    this.recruit(); this.sink.prepare(this.tick);
    const building = this.construction.completeAt === null;
    const wave = this.waves.find(wave => wave.startAt <= this.tick && this.tick < wave.endAt);
    this.switchMiner(wave?.request,building);
    let deposit = 0;
    if (building && wave) advanceStartupBuilding(this.construction,this.delivery,wave,this.tick);
    else deposit = this.station(wave);
    advanceStartupCouriers(this.couriers,this.delivery,this.tick,this.input.project.spawning.cash.horizon,this.sink);
    this.sink.finish(); this.delivery.containerEnergy += deposit;
    if (!building && !this.container.finish(this.tick,this.delivery.containerEnergy)) this.delivery.containerEnergy = 0;
    if (!(building && wave)) this.regenerate(building);
    if (building) { this.construction.source = { ...this.delivery.source }; this.construction.projectedThrough = this.tick+1; }
    this.queueReceipts(); this.account(); this.tick++;
  }
  private recruit(): void {
    const births = this.timeline.begin(this.tick);
    if (!births.length) return;
    this.births.push(...births); this.waves = startupConstructionWaves(this.input.project,this.births);
    this.couriers.push(...startupDeliveryCouriers(this.input,births)); this.couriers.sort((a,b) => a.request.localeCompare(b.request));
  }
  private switchMiner(next: string | undefined, building: boolean): void {
    if (next === this.previousMiner) return;
    if (building) this.construction.unusedCargoEnergy += this.delivery.minerCargoEnergy;
    this.delivery.unusedMinerCargoEnergy += this.delivery.minerCargoEnergy; this.delivery.minerCargoEnergy = 0; this.previousMiner = next;
  }
  private station(wave: StartupBuildWave | undefined): number {
    if (this.construction.completeAt === null) return 0;
    return startupMiningFrame(this.delivery,wave,this.tick,this.input.containerCapacity,this.container);
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
    const credit = receipts.reduce((sum,receipt) => sum+receipt.energy,0), flows = this.timeline.frameFlows();
    const ready = this.construction.completeAt !== null && this.construction.completeAt <= this.tick;
    this.houseAccounting.frame(this.tick,flows,credit,ready); this.sourceAccounting.frame(this.tick,flows.filter(flow => flow.kind !== 'delivery'),credit,ready);
    this.timeline.finish(receipts); this.due.delete(this.tick);
    this.settled.push(...receipts.map(({ tick,energy,request }) => ({ tick,energy,request })));
  }
}
