import { startupInitialMotionInput } from './startup-initial-motion';
import { paidRouteProgram } from '../../src/app/remotes/startup/route-control/program';
import type { PaidUnitContext } from '../../src/app/remotes/startup/motion-observation/model';
import type { PaidCourierOpening } from '../../src/app/remotes/startup/motion-observation/opening-model';
import type { PaidCourierContinuation } from '../../src/app/remotes/startup/projection/motion/continuation-model';
export function paidRouteFixture() {
  const input = startupInitialMotionInput(0),motion = input.motion!,point = (x: number) => ({ room: 'W0N1',x,y: 25 });
  const context: PaidUnitContext = { cohort: { home: 'W0N1',room: 'W0N1',source: 'source',generation: 1,endpoint: 'bank' },
    paid: { request: 'paid-courier',owner: 'paid-owner',body: ['carry','move'],capacity: 50,startAt: 0,activeAt: 6,retireAt: 1490,expiresAt: 1506 },
    plan: { home: 'W0N1',room: 'W0N1',source: 'source',spawn: { id: 'spawn',position: point(9),exit: point(10) },station: { room: 'W0N1',x: 12,y: 24 },collection: point(12),endpoint: { id: 'bank',position: point(9),deposit: point(10) },miner: ['work','carry','move'],courier: ['carry','move'] } };
  const opening: PaidCourierOpening = { observed: { observedAt: 100,name: 'paid-courier',unit: 'native-id',owner: 'paid-owner',position: point(14),energy: 32,fatigue: 0,activeAt: 6,retireAt: 1490,expiresAt: 1506,stage: 'deliver' },continuation: { stage: 'deliver',readyAt: 100,requestRemaining: 32 } };
  const compiled: PaidCourierContinuation = { observedAt: 100,unit: 'native-id',source: 'source',routeVersion: 'route-v1',topologyVersion: 'matrix-v1',basis: JSON.parse(JSON.stringify(opening)),
    initial: { ...input.initial!.couriers[0]!,expiresAt: 1406,retireTicks: 16 },opening: motion.openings![0]!,route: motion.routes[0]!,terrain: motion.terrain };
  const program = paidRouteProgram(context,compiled,opening,100)!;
  return { context,opening,compiled,program,point };
}
