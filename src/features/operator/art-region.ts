import type { Position } from '../../capabilities/movement/step';
import type { RepairRegion } from '../../capabilities/work/repair-exclusion';
export interface ArtMarker { name: string; position: Position }
export type ArtRegionResult = { status: 'absent' } | { status: 'valid'; region: RepairRegion } | { status: 'invalid'; reason: string };
export function parseArtRegion(room: string, markers: readonly ArtMarker[]): ArtRegionResult {
  const art = markers.filter(marker => marker.position.room === room && marker.name.includes('Art'));
  if (!art.length) return { status: 'absent' };
  const bottomLeft = art.filter(marker => marker.name.indexOf('BL') > 0);
  const topRight = art.filter(marker => marker.name.indexOf('TR') > 0);
  if (bottomLeft.length !== 1 || topRight.length !== 1) return { status: 'invalid', reason: 'expected-one-BL-and-one-TR' };
  const bl = bottomLeft[0]!, tr = topRight[0]!;
  if (bl.name === tr.name) return { status: 'invalid', reason: 'corners-must-be-distinct' };
  if (![bl.position.x, bl.position.y, tr.position.x, tr.position.y].every(value => Number.isInteger(value) && value >= 0 && value < 50)) {
    return { status: 'invalid', reason: 'invalid-corner-position' };
  }
  if (bl.position.x > tr.position.x || tr.position.y > bl.position.y) return { status: 'invalid', reason: 'reversed-corners' };
  return { status: 'valid', region: { room, left: bl.position.x, right: tr.position.x, top: tr.position.y, bottom: bl.position.y } };
}
