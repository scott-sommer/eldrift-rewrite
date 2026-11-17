import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
import type { PlacedTile } from '../../capabilities/planning/template';
import { adjacentTiles, tileIndex } from '../../core/geometry/local-grid';
/** Explicit accounting includes intentionally exposed infrastructure and fixed room objects. */
export function defenseAssetInventory(observation: AssessmentInput, entries: readonly PlacedTile[], valuableTypes: readonly string[]) {
  const required = new Set(valuableTypes), protectedAssets = entries.filter(entry => required.has(entry.type));
  const assets: { id: string; position: PlacedTile['position'] }[] = [], exemptions: { id: string; reason: string }[] = [];
  const add = (id: string, position: PlacedTile['position'], reason?: string) => {
    assets.push({ id, position: { ...position } });
    if (reason) exemptions.push({ id, reason });
  };
  for (const entry of entries) add('plan:' + entry.type + ':' + tileIndex(entry.position), entry.position,
    required.has(entry.type) ? undefined : 'Distributed ' + entry.type + ' is outside core protection policy');
  addInfrastructure(observation, required, protectedAssets, add);
  addObjects(observation, add);
  if (!protectedAssets.length) throw new Error('Missing valuable defense assets');
  const exempt = new Set(exemptions.map(item => item.id));
  const protectedTiles = [...new Map(assets.filter(item => !exempt.has(item.id))
    .map(item => [tileIndex(item.position), { ...item.position }])).values()];
  return { protectedAssets, protectedTiles, protection: { assets, exemptions } };
}

type AddAsset = (id: string, position: PlacedTile['position'], reason?: string) => void;
function addInfrastructure(observation: AssessmentInput, required: Set<string>, protectedAssets: PlacedTile[], add: AddAsset): void {
  for (const item of observation.infrastructure) {
    const protect = item.owned && required.has(item.type);
    add('observed:' + item.id, item.position, protect ? undefined : 'Observed ' + item.type + ' is outside owned core protection policy');
    if (protect && !protectedAssets.some(entry => entry.type === item.type && tileIndex(entry.position) === tileIndex(item.position))) {
      protectedAssets.push({ type: item.type, position: { ...item.position } });
    }
  }
}
function addObjects(observation: AssessmentInput, add: AddAsset): void {
  for (const item of observation.objects) {
    add('object:' + item.id, item.position, item.kind === 'controller' ? undefined : 'Distributed ' + item.kind + ' operation');
    if (item.kind === 'controller') for (const tile of adjacentTiles(item.position)) {
      if (observation.terrain[tileIndex(tile)] !== 'wall') add('controller-access:' + item.id + ':' + tileIndex(tile), tile);
    }
  }
}
