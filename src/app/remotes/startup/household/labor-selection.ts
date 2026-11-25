import { createMatrixSnapshots } from '../../../../adapters/screeps/matrix-snapshots';
import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { observeWorkAssessment } from '../../../../adapters/screeps/work-assessment';
import { selectWork } from '../../../../features/work/select';
import { selectWorkService } from '../../../../features/work/service-tiles';
import { createNativeLaborCandidate } from './labor-candidate';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { WorkerMode, WorkPolicy } from '../../../../features/work/policy';
import type { LaborCandidateSeed } from '../../../../capabilities/economy/startup/household/labor/candidate-model';
export interface NativeLaborSelection {
  base: LaborCandidateSeed['base']; endpoint: string; request: LaborCandidateSeed['proposal']['request'];
  mode: WorkerMode; workPolicy: Readonly<WorkPolicy>; laborPolicy: LaborCandidateSeed['proposal']['policy'];
}
/** Shared work policy selects the target; injected service strategy selects geometry. No recruitment or dispatch. */
export function createNativeLaborSelection(state: StatePort, maximumOps: number, service = selectWorkService) {
  const candidate = createNativeLaborCandidate(state,maximumOps), matrices = createMatrixSnapshots();
  return (seed: NativeLaborSelection, maximumFrames: number, guard: () => boolean = () => true) => {
    if (!guard()) return deferred('admission');
    const home = Game.rooms[seed.request.room], source = Game.getObjectById(seed.endpoint as Id<StructureStorage>), exit = seed.request.placement?.exit;
    if (!home?.controller?.my || !source?.pos || source.pos.roomName !== home.name || !exit) return deferred('selection-context');
    const matrix = matrices.prepare([home.name],{ roadCost: 1,avoidUnits: false }).matrix(home.name), ground = home.getTerrain();
    if (!matrix) return deferred('selection-matrix');
    const standable = (point: typeof exit) => matrix.get(point.x,point.y) !== 255 && (ground.get(point.x,point.y)&TERRAIN_MASK_WALL) === 0;
    const pickup = service(movementPosition(source.pos),exit,1,standable);
    if (!pickup) return deferred('pickup-service');
    const order = selectWork(observeWorkAssessment(home),pickup,seed.mode,seed.workPolicy);
    if (!order) return deferred('work-target');
    const targetService = service(order.position,pickup,3,standable);
    if (!targetService) return deferred('target-service');
    return candidate({ base: seed.base,endpoint: seed.endpoint,proposal: { observedAt: Game.time,request: seed.request,source: seed.endpoint,pickup,order,service: targetService,policy: seed.laborPolicy } },maximumFrames,undefined,guard);
  };
}
function deferred(reason: string) { return { status: 'deferred' as const,reason,previewFrames: 0 }; }
