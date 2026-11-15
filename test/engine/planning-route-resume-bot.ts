import { loop as botLoop } from '../../src/main';
import { verifyRouteCheckpoint } from './route-checkpoint-check';
export function loop() {
  botLoop();
  verifyRouteCheckpoint();
}
