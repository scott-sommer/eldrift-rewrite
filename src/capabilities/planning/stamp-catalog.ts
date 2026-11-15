import type { LayoutStamp, StampTile } from './stamp-placement';
import type { StructureLimits } from './core-model';
import { validateLimits } from './staging';
import { stageConstrainedCore } from './constrained-core';
/** Independent geometry; routing and whole-plan validation still own connectivity/capacity. */
export function createStampCatalog(limits: StructureLimits): LayoutStamp[] {
  const stamps: LayoutStamp[] = [hub(limits), labs(limits)];
  for (const type of ['spawn', 'tower', 'factory', 'powerSpawn', 'nuker', 'observer']) {
    const count = capacity(limits, type)[8]!;
    for (let ordinal = 0; ordinal < count; ordinal++) stamps.push(single(type, ordinal, limits));
  }
  const count = capacity(limits, 'extension')[8]!;
  for (let start = 0; start < count; start += 5) stamps.push(extensions(start, Math.min(5, count - start), limits));
  return stamps;
}
const priorities: Readonly<Record<string, number>> = {
  storage: -500, spawn: -430, extension: -400, link: -365, tower: -340,
  terminal: -320, lab: -300, factory: -260, powerSpawn: -240, nuker: -220, observer: -210, road: -220,
};
function cell(type: string, x: number, y: number, rcl: number): StampTile {
  const priority = priorities[type];
  if (priority === undefined) throw new Error('Missing stamp priority: ' + type);
  return { type, offset: { x, y }, rcl, priority, tag: 'stamp' };
}
function capacity(limits: StructureLimits, type: string): readonly number[] {
  const values = limits[type];
  if (!values) throw new Error('Missing stamp limits: ' + type);
  validateLimits(values);
  return values;
}
function level(limits: StructureLimits, type: string, ordinal: number): number {
  const result = capacity(limits, type).findIndex((count, rcl) => rcl > 0 && count > ordinal);
  if (result < 1) throw new Error('Stamp capacity exceeded: ' + type);
  return result;
}
function hub(limits: StructureLimits): LayoutStamp {
  const tiles = [cell('storage', 0, 0, level(limits, 'storage', 0)),
    cell('terminal', 1, 0, level(limits, 'terminal', 0)), cell('link', 0, 1, level(limits, 'link', 0))];
  const ports = [{ x: -1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -1 }];
  return { id: 'hub-v1', tiles: [...tiles, ...ports.map(tile => cell('road', tile.x, tile.y, 1))], ports };
}
function single(type: string, ordinal: number, limits: StructureLimits): LayoutStamp {
  const rcl = level(limits, type, ordinal);
  const ports = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
  return { id: type + '-' + ordinal + '-v1',
    tiles: [cell(type, 0, 0, rcl), ...ports.map(tile => cell('road', tile.x, tile.y, rcl))], ports };
}
function extensions(start: number, count: number, limits: StructureLimits): LayoutStamp {
  const tiles: StampTile[] = [];
  for (let index = 0; index < count; index++) {
    const rcl = level(limits, 'extension', start + index);
    tiles.push(cell('extension', index, 0, rcl), cell('road', index, 1, rcl));
  }
  return { id: 'extensions-' + start + '-v1', tiles, ports: [{ x: 0, y: 1 }, { x: count - 1, y: 1 }] };
}
function labs(limits: StructureLimits): LayoutStamp {
  const core = stageConstrainedCore({ x: 25, y: 25 }, 0, limits);
  if (!core) throw new Error('Missing lab stamp core');
  const tiles = core.filter(entry => entry.type === 'lab' || entry.type === 'road')
    .map(entry => cell(entry.type, entry.position.x - 25, entry.position.y - 25, entry.rcl));
  return { id: 'reaction-labs-v1', tiles, ports: [{ x: -1, y: 0 }, { x: 1, y: 1 }] };
}
