import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { createNativeDispatch } from './native-dispatch';
import { createBoostRequests } from '../features/industry/boosts/store';
import { reserveBoostStock, releaseBoostStock, stopBoostService } from '../features/industry/boosts/resources';
import type { BoostJob, BoostStep, BoostUnit } from '../capabilities/industry/boosts/model';
import { boostScope, boostServiceOwner, terminalBoost } from '../capabilities/industry/boosts/model';
import { observeBoostJob, boostStep, missingBoostParts, finish, boostedParts } from '../capabilities/industry/boosts/observe';
import { planBoostSupply } from '../capabilities/industry/boosts/supply';
import { nativeBoostLab, nativeBoostUnit } from './native-boost-facts';
import { selectNativeBoostLab, fenceReactionService } from './native-boost-labs';
import { nativeLabWarehouses } from './native-lab-transport';
import { reconcileServiceRequest } from '../features/logistics/service-request';
type Dispatch = Pick<ReturnType<typeof createNativeDispatch>,'structures' | 'movement' | 'activate'>;
/** Persistent attempts precede native effects; body observation is the only success boundary. */
export class NativeBoostCycle {
  private readonly store;
  constructor(private readonly state: StatePort,private readonly dispatch: Dispatch,private readonly config: (home: string) => Readonly<RuntimeConfig>) { this.store = createBoostRequests(state); }
  run(owner: string,id: string): void {
    const job = this.store.get(owner,id)!;
    const unit = nativeBoostUnit(job);
    observeBoostJob(job,unit,Game.time); this.save(job);
    if (terminalBoost(job)) { this.cleanup(job); return; }
    if (job.attempt || !unit || unit.spawning) return;
    const step = boostStep(job)!;
    if (!this.compatible(job,unit)) { this.fail(job,'unsupported-boost'); return; }
    const missing = missingBoostParts(job,unit,step);
    if (missing === null) { this.fail(job,'insufficient-healthy-body'); return; }
    const lab = this.lab(job,step);
    if (!lab) return;
    this.prepare(job,unit,step,missing,lab);
  }
  private compatible(job: BoostJob,unit: BoostUnit): boolean {
    const catalog = BOOSTS as Record<string,Record<string,unknown>>;
    return job.request.steps.every(step => Object.hasOwn(catalog,step.part) && Object.hasOwn(catalog[step.part]!,step.resource) && missingBoostParts(job,unit,step) !== null);
  }
  private lab(job: BoostJob,step: BoostStep): StructureLab | null {
    if (!Game.rooms[job.request.home]) return null;
    if (job.lab) {
      const lab = Game.getObjectById(job.lab as Id<StructureLab>);
      if (!lab?.my || lab.structureType !== STRUCTURE_LAB || !lab.isActive()) { this.fail(job,'lab-lost'); return null; }
      return lab;
    }
    const lab = selectNativeBoostLab(this.state,job,step,this.dispatch.structures,this.config(job.request.home).labBoostRoles);
    if (!lab) return null;
    job.lab = lab.id; this.save(job); return lab;
  }
  private prepare(job: BoostJob,unit: BoostUnit,step: BoostStep,missing: number,lab: StructureLab): void {
    fenceReactionService(this.state,job,lab);
    const facts = nativeBoostLab(lab), config = this.config(job.request.home), mineral = missing*LAB_BOOST_MINERAL, energy = missing*LAB_BOOST_ENERGY;
    if (facts.mineral !== step.resource) releaseBoostStock(this.state,job);
    const desired = planBoostSupply(facts,nativeLabWarehouses(this.state,lab.room,config),{ resource: step.resource,mineral,energy,maximum: config.labTransportBatch,
      mineralReserve: config.labSupplyReserve,energyReserve: config.storageEnergyReserve });
    reconcileServiceRequest(this.state,job.request.home,Game.time,boostServiceOwner(job.request),0,desired);
    if (facts.mineral !== step.resource || facts.amount < mineral || facts.energy < energy) return;
    if (!reserveBoostStock(this.state,job,facts,step.resource,mineral,energy,Game.time)) return;
    const creep = Game.getObjectById(job.request.unit as Id<Creep>)!;
    this.dispatch.activate();
    if (!creep.pos.isNearTo(lab)) {
      this.dispatch.movement.move(creep,{ owner: boostScope(job.request),destination: { room: lab.room.name,x: lab.pos.x,y: lab.pos.y },range: 1,
        policy: { version: 'boost-approach',blockedRooms: [],costs: {},maximumRooms: 16 } });
      return;
    }
    this.issue(job,unit,step,missing,lab,creep);
  }
  private issue(job: BoostJob,unit: BoostUnit,step: BoostStep,count: number,lab: StructureLab,creep: Creep): void {
    job.attempt = { tick: Game.time,before: boostedParts(unit,step),count,resource: step.resource,part: step.part,code: null }; job.status = 'issued';
    this.save(job);
    const code = this.dispatch.structures.boost(lab,creep,boostScope(job.request),count);
    job.attempt.code = code; this.save(job);
  }
  private fail(job: BoostJob,reason: string): void { finish(job,'failed',reason); this.save(job); this.cleanup(job); }
  private cleanup(job: BoostJob): void {
    releaseBoostStock(this.state,job);
    if (!stopBoostService(this.state,job,Game.time) && job.lab !== null) { job.lab = null; this.save(job); }
  }
  private save(job: BoostJob): void { this.store.update(job.request.owner,job.request.id,current => Object.assign(current,job)); }
}
