import type { SourceStartupSurvey } from './model';
/** Current native facts only. Unknown construction never becomes a free or completed project. */
export function createStartupSurvey() {
  let tick = -1; const cache = new Map<string,SourceStartupSurvey>();
  return (room: string,source: string): SourceStartupSurvey => {
    if (tick !== Game.time) { tick = Game.time; cache.clear(); }
    const key = JSON.stringify([room,source]), known = cache.get(key);
    if (known) return known;
    const result = survey(room,source); cache.set(key,result); return result;
  };
}
function survey(room: string, id: string): SourceStartupSurvey {
  const visible = Game.rooms[room], source = Game.getObjectById(id as Id<Source | Mineral>);
  if (!visible || !source || !('energyCapacity' in source) || source.pos.roomName !== room) return { status: 'unknown' };
  const container = visible.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_CONTAINER && source.pos.inRangeTo(item.pos,1));
  if (container) return { status: 'ready',source };
  const site = visible.find(FIND_MY_CONSTRUCTION_SITES).find(item => item.structureType === STRUCTURE_CONTAINER && source.pos.inRangeTo(item.pos,1));
  return site ? { status: 'building',source,site } : { status: 'missing',source };
}
