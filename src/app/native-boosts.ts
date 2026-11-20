import type { BoostJob } from '../capabilities/industry/boosts/model';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { SchedulerPorts } from '../core/scheduling/model';
import type { createNativeDispatch } from './native-dispatch';
import { createBoostRequests } from '../features/industry/boosts/store';
import { boostScope, holdsBoostUnit } from '../capabilities/industry/boosts/model';
import { sameUnit } from '../capabilities/industry/boosts/observe';
import { nativeBoostUnit } from './native-boost-facts';
import { NativeBoostCycle } from './native-boost-cycle';
/** Prepare action gates before room scheduling; bounded execution advances eight jobs fairly per tick. */
export function createNativeBoosts(state: StatePort,dispatch: ReturnType<typeof createNativeDispatch>,config: (home: string) => Readonly<RuntimeConfig>,failures: Pick<SchedulerPorts,'reportFailure'>) {
  const store = createBoostRequests(state), cycle = new NativeBoostCycle(state,dispatch,config);
  function run(): void {
    for (const job of store.read()) prepare(job);
    for (const job of store.batch(Game.time)) {
      try { cycle.run(job.request.owner,job.request.id); }
      catch (error) { try { failures.reportFailure({ id: 'boost/'+job.request.id,room: job.request.home,tick: Game.time,error }); } catch { /* Other jobs retain their gates even if reporting fails. */ } }
    }
  }
  function prepare(job: BoostJob): void {
    const unit = nativeBoostUnit(job), owner = boostScope(job.request);
    if (unit && !unit.spawning && sameUnit(job,unit) && holdsBoostUnit(job)) {
      const creep = Game.getObjectById(unit.id as Id<Creep>)!;
      dispatch.arbiter.claim(unit.name,owner); dispatch.structures.holdBody(creep,owner);
    }
    const lab = job.lab ? Game.getObjectById(job.lab as Id<StructureLab>) : null;
    if (lab?.my && lab.structureType === STRUCTURE_LAB) dispatch.structures.holdLab(lab,owner);
    }
  return { run,before(admit: () => boolean): () => boolean { return () => { if (!admit()) return false; run(); return true; }; } };
}
