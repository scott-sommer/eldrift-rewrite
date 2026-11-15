import { loop as botLoop } from '../../src/main';
import { observeRoomAssessment } from '../../src/adapters/screeps/room-assessment';
export function loop() {
  botLoop();
  const room = Game.rooms.W0N1!, snapshot = observeRoomAssessment(room.name)!;
  const result = snapshot.assessment;
  const road = room.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_ROAD)!;
  const index = road.pos.y * 50 + road.pos.x;
  const row = { tick: snapshot.observedAt, fingerprint: snapshot.fingerprint, regions: result.regions.length,
    roadWalkable: result.walkable[index], roadAvailable: result.available[index],
    sourceCount: result.access.filter(item => item.kind === 'source').length,
    controllerCount: result.access.filter(item => item.kind === 'controller').length,
    siteCount: result.constraints.length, anchorCount: result.anchors.length,
    hiddenAbsent: observeRoomAssessment('E9S9') === undefined,
    sites: room.find(FIND_CONSTRUCTION_SITES).map(item => [item.id, item.progress]) };
  const memory = Memory as Memory & { assessmentRows?: (typeof row)[] };
  (memory.assessmentRows ??= []).push(row);
}
