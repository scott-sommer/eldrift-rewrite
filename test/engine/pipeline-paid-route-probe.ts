import { createNativePaidCourierRouteControl } from '../../src/app/remotes/startup/route-control/native';
import { createPaidCourierRouteStore } from '../../src/features/remotes/startup/routes/store';
import type { StatePort,Envelope } from '../../src/persistence/versioned-state';
import type { RuntimeConfig } from '../../src/config/model';
import type { PaidUnitContext } from '../../src/app/remotes/startup/motion-observation/model';
import type { PaidCourierContinuation } from '../../src/app/remotes/startup/projection/motion/continuation-model';
interface RouteFixtureMemory extends Memory { pipelineRouteFixture?: { records: Record<string,Envelope>; writes: number } }
/** Shadow-only activation against actual facts. No physical routing or live owner mutation. */
export function probePaidRouteActivation(actual: StatePort,config: Readonly<RuntimeConfig>,context: PaidUnitContext,compiled: PaidCourierContinuation) {
  const root = (Memory as RouteFixtureMemory).pipelineRouteFixture ??= { records: {},writes: 0 },key = 'remoteStartupRoutes/'+context.cohort.home;
  const state: StatePort = { read: target => target === key ? root.records[target] : actual.read(target),write(target,value) {
    if (target !== key) throw new Error('Route probe attempted foreign owner write');
    root.records[target] = value; root.writes++;
  } };
  const control = createNativePaidCourierRouteControl(state,{ follow() { throw new Error('Shadow route probe attempted movement'); } },() => config);
  const current = createPaidCourierRouteStore(state,context.cohort.home).read(),result = control.activate(context,compiled,current.revision);
  if (result.status === 'deferred') return result;
  const route = result.route,program = route.program;
  return { status: 'ready' as const,revision: result.revision,activatedAt: program.activatedAt,name: program.name,unit: program.unit,home: program.home,source: program.source,generation: program.generation,
    phase: route.phase,readyAt: route.readyAt,cursor: route.cursor?.index ?? null,routeVersion: program.routeVersion,topologyVersion: program.topologyVersion,writeKeys: Object.keys(root.records) };
}
