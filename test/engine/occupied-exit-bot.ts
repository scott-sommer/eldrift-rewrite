import { loop as botLoop } from '../../src/main';
import { createTrafficAuthority } from '../../src/capabilities/movement/traffic/authority';
import { createMovementLegality, movementOccupants, movementPosition } from '../../src/adapters/screeps/movement-traffic';
import { createMatrixSnapshots } from '../../src/adapters/screeps/matrix-snapshots';
const traffic = createTrafficAuthority({
  clock: () => Game.time, observe: movementOccupants, legal: createMovementLegality(createMatrixSnapshots()),
  issue: () => { throw new Error('Occupied exit must never dispatch'); },
});
declare global { interface Memory { occupiedExit?: { mover: string[]; blocker: string[]; reasons: string[] } } }
export function loop() {
  botLoop();
  const evidence = Memory.occupiedExit ??= { mover: [], blocker: [], reasons: [] };
  const mover = Game.creeps['explorer']!;
  const blocker = Game.creeps['edge-blocker']!;
  evidence.mover.push(JSON.stringify(movementPosition(mover.pos)));
  evidence.blocker.push(JSON.stringify(movementPosition(blocker.pos)));
  traffic.submit({ unit: mover.id, owner: 'exit', from: movementPosition(mover.pos),
    via: { room: 'W0N1', x: 49, y: 20 }, to: { room: 'E0N1', x: 0, y: 20 }, mobile: true, priority: 0 });
  const result = traffic.flush()!;
  if (result.outcomes.length) throw new Error('Unexpected exit intent');
  evidence.reasons.push(result.resolution.denied[0]?.reason ?? 'missing');
}
