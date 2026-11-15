import { verifyCandidateEnumeration } from './candidate-enumeration-check';
import { loop as botLoop } from '../../src/main';
import { verifyRouteCheckpoint } from './route-checkpoint-check';
let runtimeCalls = 0;
export function loop() {
  botLoop();
  const memory = Memory as Memory & { planningRuntimeRows?: { tick: number; calls: number }[] };
  (memory.planningRuntimeRows ??= []).push({ tick: Game.time, calls: ++runtimeCalls });
  verifyRouteCheckpoint();
  verifyCandidateEnumeration();
}
