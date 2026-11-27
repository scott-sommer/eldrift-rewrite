import { createStartupOpeningStock } from './opening-stock';
import { startupProjectWaves } from './initial';
import { initialStartupConstruction } from './construction';
import { initialStartupDelivery } from './delivery';
import { startupMiningFrame } from './delivery-mining';
import { advanceStartupBuilding } from './project-building';
import { createStartupContainer } from './container';
import { advanceStartupSource } from './source';
import type { StartupDeliveryInput } from './delivery-model';
import type { StartupProjectCheckpoint } from './checkpoints/project-model';
import type { StartupBuildWave } from './construction-model';
/** Source stocks, work and maintenance only; home cash, sink and courier motion have separate owners. */
export class StartupProjectSource {
  readonly container;
  readonly construction;
  readonly delivery;
  readonly opening;
  private nextTick: number;
  private pending = false;
  private previousMiner: string | undefined;
  constructor(private readonly input: StartupDeliveryInput,saved?: StartupProjectCheckpoint) {
    this.nextTick = saved?.tick ?? 0;
    this.container = createStartupContainer(input.container,saved?.container);
    this.construction = saved?.construction ?? initialStartupConstruction(input.project);
    this.delivery = saved?.delivery ?? initialStartupDelivery(this.construction);
    this.opening = createStartupOpeningStock(input,this.delivery,saved?.opening);
    this.restoreOpening(saved);
  }
  private restoreOpening(saved: StartupProjectCheckpoint | undefined): void {
    if (!saved) { this.delivery.containerEnergy = this.input.initial?.containerEnergy ?? 0; return; }
    this.previousMiner = startupProjectWaves(this.input,saved.timeline.births).find(wave => wave.startAt <= saved.tick-1 && saved.tick-1 < wave.endAt)?.request;
  }
  /** Finish after courier service: same-frame production cannot be collected until the next frame. */
  prepare(tick: number,wave: StartupBuildWave | undefined) {
    if (this.pending || tick !== this.nextTick) throw new Error('Invalid source frame phase');
    this.pending = true;
    const building = this.construction.completeAt === null;
    this.switchMiner(wave?.request,building); this.opening.activate(wave?.request,tick);
    let deposit = 0;
    if (building && wave) this.build(wave,tick);
    else deposit = this.station(wave,tick);
    return { finish: () => this.finish(tick,wave,building,deposit) };
  }
  private finish(tick: number,wave: StartupBuildWave | undefined,building: boolean,deposit: number): void {
    if (!this.pending || tick !== this.nextTick) throw new Error('Invalid source frame phase');
    this.delivery.containerEnergy += deposit;
    if (!building && !this.container.finish(tick,this.delivery.containerEnergy)) this.delivery.containerEnergy = 0;
    if (!(building && wave)) this.regenerate(building);
    if (building) { this.construction.source = { ...this.delivery.source }; this.construction.projectedThrough = tick+1; }
    this.nextTick++; this.pending = false;
  }
  private build(wave: StartupBuildWave,tick: number): void {
    const before = this.construction.constructionEnergy;
    advanceStartupBuilding(this.construction,this.delivery,wave,tick);
    this.opening.built(wave.request,this.construction.constructionEnergy-before);
  }
  private switchMiner(next: string | undefined,building: boolean): void {
    if (next === this.previousMiner) return;
    this.opening.leave(this.previousMiner);
    if (building) this.construction.unusedCargoEnergy += this.delivery.minerCargoEnergy;
    this.delivery.unusedMinerCargoEnergy += this.delivery.minerCargoEnergy; this.delivery.minerCargoEnergy = 0; this.previousMiner = next;
  }
  private station(wave: StartupBuildWave | undefined,tick: number): number {
    if (this.construction.completeAt === null) return 0;
    const before = this.delivery.minerCargoEnergy;
    const deposit = startupMiningFrame(this.delivery,wave,tick,this.input.containerCapacity,this.container);
    this.opening.spent(wave?.request,before,this.delivery.minerCargoEnergy); return deposit;
  }
  private regenerate(building: boolean): void {
    const amount = advanceStartupSource(this.delivery.source,1);
    if (building) this.construction.regeneratedEnergy += amount;
    else this.delivery.regeneratedEnergy += amount;
  }
}
