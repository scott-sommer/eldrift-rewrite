import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { FixedObject } from './assessment-model';
import { adjacentContainer } from './container-placement';
import { nearbyUtility, sourceLinkPosition } from './utility-placement';
export interface InfrastructureProposal {
  type: string; position: Tile; minimumRcl: number; priority: number;
  tag: 'controller' | 'source' | 'mineral'; objectId: string;
}
export interface InfrastructureInput {
  storage: Tile; objects: readonly FixedObject[]; reserved: readonly Tile[];
  available: (type: string, position: Tile) => boolean;
  adjacentRoads: (position: Tile) => number; open: (position: Tile) => boolean;
}
/** Minimum RCLs are requests: shared room capacity must be scheduled after composition. */
export function resourceInfrastructure(input: InfrastructureInput) {
  const draft = new InfrastructureDraft(input);
  const ordered = [...input.objects].sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.id.localeCompare(b.id));
  for (const object of ordered) draft.addObject(object);
  return { entries: draft.entries, missing: draft.missing };
}
function kindOrder(kind: FixedObject['kind']): number {
  return { controller: 0, source: 1, mineral: 2 }[kind];
}
class InfrastructureDraft {
  readonly entries: InfrastructureProposal[] = [];
  readonly missing: string[] = [];
  private readonly reserved: Set<number>;
  constructor(private readonly input: InfrastructureInput) {
    this.reserved = new Set(input.reserved.map(tileIndex));
  }
  private available(type: string, position: Tile): boolean {
    return !this.reserved.has(tileIndex(position)) && this.input.available(type, position);
  }
  private add(object: FixedObject, type: string, position: Tile | undefined, minimumRcl: number, priority: number): void {
    if (!position) { this.missing.push(object.id + ':' + type); return; }
    this.reserved.add(tileIndex(position));
    this.entries.push({ type, position: { ...position }, minimumRcl, priority, tag: object.kind, objectId: object.id });
  }
  addObject(object: FixedObject): void {
    if (object.kind === 'controller') { this.controller(object); return; }
    const container = adjacentContainer({
      origin: object.position, target: this.input.storage,
      available: position => this.available('container', position),
      adjacentRoads: this.input.adjacentRoads, open: this.input.open,
    });
    if (object.kind === 'mineral') {
      const extractor = this.available('extractor', object.position) ? object.position : undefined;
      this.add(object, 'extractor', extractor, 6, -180);
      this.add(object, 'container', container, 6, -310);
      return;
    }
    this.add(object, 'container', container, 3, -398);
    const link = sourceLinkPosition({
      source: object.position, ...(container ? { container } : {}), storage: this.input.storage,
      available: position => this.available('link', position), adjacentRoads: this.input.adjacentRoads,
    });
    this.add(object, 'link', link, 6, -355);
  }
  private controller(object: FixedObject): void {
    const link = nearbyUtility({
      center: object.position, minRange: 1, maxRange: 2, targets: [this.input.storage],
      available: position => this.available('link', position), adjacentRoads: this.input.adjacentRoads,
    });
    this.add(object, 'link', link, 5, -375);
  }
}
