import { loop as botLoop } from '../../src/main';
import { observeRoomAssessment } from '../../src/adapters/screeps/room-assessment';
export function loop() {
  botLoop();
  const room = Game.rooms.W0N1!;
  const constraints = Game.time >= 6 && Game.time <= 7
    ? [{ id: 'manual', kind: 'keep-clear' as const, position: { x: 25, y: 25 } }] : [];
  const snapshot = observeRoomAssessment(room.name, { constraints })!;
  const result = snapshot.assessment;
  const road = room.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_ROAD)!;
  const index = road.pos.y * 50 + road.pos.x;
  const row = { tick: snapshot.observedAt, fingerprint: snapshot.fingerprint, regions: result.regions.length,
    manualAvailable: result.available[25 * 50 + 25], roadWalkable: result.walkable[index], roadAvailable: result.available[index],
    sourceCount: result.access.filter(item => item.kind === 'source').length,
    controllerCount: result.access.filter(item => item.kind === 'controller').length,
    siteCount: result.constraints.length, anchorCount: result.anchors.length,
    hiddenAbsent: observeRoomAssessment('E9S9') === undefined,
    sites: room.find(FIND_CONSTRUCTION_SITES).map(item => [item.id, item.progress]) };
  const memory = Memory as Memory & { assessmentRows?: (typeof row)[] };
  (memory.assessmentRows ??= []).push(row);
}
