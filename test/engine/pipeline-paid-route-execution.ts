import { snapshotPipelinePaidHome } from './pipeline-paid-home-probe';
import { createNativePaidRouteInspector } from '../../src/app/remotes/startup/route-control/native';
import { createNativePaidRouteServiceMovement } from '../../src/app/remotes/startup/route-control/native-service';
import { createPaidCourierRouteStore } from '../../src/features/remotes/startup/routes/store';
import { pipelinePaidContexts } from './pipeline-paid-contexts';
import type { RemoteServiceMovementFactory } from '../../src/app/remotes/service-movement';
interface ExecutionMemory extends Memory { pipelineRouteExecution?: { rows: object[]; moves: object[]; releasedAt?: number } }
/** Existing production transport/transfer owners execute the opt-in route for a bounded native window. */
export const pipelinePaidRouteExecution: RemoteServiceMovementFactory = (state,movement,configuration) => {
  const proof = () => (Memory as ExecutionMemory).pipelineRouteExecution ??= { rows: [],moves: [] };
  const inspect = createNativePaidRouteInspector(state,configuration);
  const selected = createNativePaidRouteServiceMovement(state,movement,configuration,{
    guard: () => true,activate: () => Game.time === 150,
    contexts: guard => {
      if (Game.time < 150 || Game.time > 181) return [];
      return pipelinePaidContexts(state,configuration('W0N1'),guard)?.flatMap(context => context.cohort.workers.filter(paid => !paid.body.includes('work')).map(paid => ({ ...context,paid })));
    },
    report(context,result) {
      if (result.status === 'deferred') {
        const program = createPaidCourierRouteStore(state,context.cohort.home).read().routes.find(route => route.program.name === context.paid.request)?.program;
        const facts = inspect(context,() => true,program);
        proof().rows.push({ tick: Game.time,name: context.paid.request,...result,expectedRoute: program?.routeVersion ?? null,expectedTopology: program?.topologyVersion ?? null,facts }); return;
      }
      proof().rows.push({ tick: Game.time,name: context.paid.request,status: result.status,activatedAt: result.route.program.activatedAt,leg: result.route.leg,phase: result.route.phase,energy: result.route.energy,index: result.route.cursor?.index ?? null,position: result.route.cursor?.position ?? null });
    },
  });
  return { before() {
    selected.before();
    snapshotPipelinePaidHome(state,configuration('W0N1'));
    if (Game.time !== 181) return;
    const store = createPaidCourierRouteStore(state,'W0N1');
    for (const route of store.read().routes) if (!store.release(route.program.name,route.program.unit,Game.time,store.read().revision)) throw new Error('Failed fixture route release');
    proof().releasedAt = Game.time;
  },move(creep,command) {
    const result = selected.move(creep,command);
    if (Game.time >= 150 && Game.time < 181) proof().moves.push({ tick: Game.time,name: creep.name,status: result.status });
    return result;
  } };
};
