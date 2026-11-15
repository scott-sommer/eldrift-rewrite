import { claimStampTiles } from './stamp-claims';
import { placeOffset } from '../../core/geometry/transforms';
import type { TransformIndex } from '../../core/geometry/transforms';
import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { AssessmentInput } from './assessment-model';
import type { StagedTile, TemplateTile } from './template';
import { placementFailures } from './placement-validation';
import { validatePlanningConstraints } from './preservation';
export interface StampTile extends TemplateTile { rcl: number; priority?: number; tag?: string }
export interface LayoutStamp { id: string; tiles: readonly StampTile[]; ports: readonly Tile[] }
export interface StampPlacementInput {
  stamp: LayoutStamp; anchor: Tile; transform: TransformIndex; observation: AssessmentInput;
  entries: readonly StagedTile[]; corridors: readonly Tile[];
  claimed?: readonly string[];
  blocksMovement: (type: string) => boolean;
}
/** Atomic geometry admission only; whole-plan capacity/access/scoring remain separate. */
export function placeStamp(input: StampPlacementInput) {
  const { stamp, anchor, transform } = input;
  if (!stamp.id || !stamp.tiles.length || !stamp.ports.length) throw new Error('Invalid stamp definition');
  const placed = stampTiles(stamp, anchor, transform);
  const ports = stamp.ports.map(offset => placeOffset(anchor, offset, transform, 2));
  if (placed.some(tile => !tile) || ports.some(tile => !tile)) return rejected('bounds');
  const tiles = placed as StagedTile[], roads = ports as Tile[];
  const claimed = claimStampTiles(tiles, input.claimed ?? []);
  if (!claimed) return rejected('claimed-structure');
  const entries = mergeStampEntries(input.entries, tiles);
  if (!entries) return rejected('duplicate-structure');
  return admitStamp(entries, roads, claimed, input);
}
function admitStamp(entries: StagedTile[], roads: Tile[], claimed: string[], input: StampPlacementInput) {
  const failures = placementFailures(entries, input.observation);
  if (failures.length) return rejected(failures[0]!);
  const violations = stampConstraints(entries, input.observation);
  if (violations.length) return rejected(violations[0]!.id + ':' + violations[0]!.reason);
  if (!validPorts(roads, entries, input)) return rejected('blocked-port');
  if (input.corridors.some(position => blocked(position, entries, input))) return rejected('blocked-corridor');
  return { ok: true as const, entries, ports: roads, claimed };
}
function mergeStampEntries(existing: readonly StagedTile[], tiles: readonly StagedTile[]) {
  const entries = existing.map(entry => ({ ...entry, position: { ...entry.position } }));
  const seen = new Set<string>();
  for (const tile of tiles) {
    const key = tile.type + ':' + tileIndex(tile.position);
    if (seen.has(key)) return undefined;
    seen.add(key);
    const previous = entries.find(entry => entry.type === tile.type && tileIndex(entry.position) === tileIndex(tile.position));
    if (!previous) entries.push(tile);

  }
  return entries;
}
function validPorts(ports: readonly Tile[], entries: readonly StagedTile[], input: StampPlacementInput): boolean {
  return ports.every(position => entries.some(entry => entry.type === 'road' && tileIndex(entry.position) === tileIndex(position))
    && !blocked(position, entries, input));
}
function blocked(position: Tile, entries: readonly StagedTile[], input: StampPlacementInput): boolean {
  const index = tileIndex(position);
  return input.observation.terrain[index] === 'wall'
    || entries.some(entry => tileIndex(entry.position) === index && input.blocksMovement(entry.type))
    || input.observation.infrastructure.some(entry => tileIndex(entry.position) === index && !entry.walkable)
    || input.observation.objects.some(entry => tileIndex(entry.position) === index);
}
function rejected(reason: string) { return { ok: false as const, reason }; }

function stampTiles(stamp: LayoutStamp, anchor: Tile, transform: TransformIndex) {
  return stamp.tiles.map(tile => {
    const position = placeOffset(anchor, tile.offset, transform, 2);
    return position ? { type: tile.type, position, rcl: tile.rcl,
      ...(tile.priority === undefined ? {} : { priority: tile.priority }),
      ...(tile.tag === undefined ? {} : { tag: tile.tag }) } : undefined;
  });
}

function stampConstraints(entries: readonly StagedTile[], observation: AssessmentInput) {
  const touched = new Set(entries.map(entry => tileIndex(entry.position)));
  const constraints = observation.constraints.filter(item => item.kind !== 'locked' || touched.has(tileIndex(item.position)));
  return validatePlanningConstraints(entries, constraints);
}
