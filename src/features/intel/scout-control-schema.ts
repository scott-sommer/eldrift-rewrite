import type { StateSchema } from '../../persistence/versioned-state';
import { validExecution } from '../../core/execution/validation';
import { object, natural, text } from './validation';
import { validScoutRoom } from './scout-validation';
import { scoutControlPhases } from './scout-control-model';
import type { ScoutControl } from './scout-control-model';
import type { Position } from '../../capabilities/movement/step';
const phases: readonly string[] = scoutControlPhases;
export interface ScoutControls { units: ScoutControl[] }
function position(value: unknown): value is Position {
  return object(value) && validScoutRoom(value.room) && natural(value.x) && value.x < 50 && natural(value.y) && value.y < 50;
}
function counters(value: Record<string, unknown>): boolean {
  return ['assignmentIndex','enteredAt','stuck','oscillations','escapeCursor'].every(key => natural(value[key]));
}
function nullable(value: unknown, valid: (value: unknown) => boolean): boolean { return value === null || valid(value); }
function navigation(value: Record<string, unknown>): boolean {
  if (!validScoutRoom(value.room) || !nullable(value.objective, validScoutRoom)) return false;
  if (!nullable(value.lastPosition, position) || !nullable(value.previousRoom, validScoutRoom)) return false;
  return nullable(value.lastTick,natural) && nullable(value.transitionAt,natural) && typeof value.visited === 'boolean' && typeof value.moving === 'boolean';
}
function assignments(value: Record<string, unknown>): boolean {
  return Array.isArray(value.assigned) && value.assigned.length <= 64 && value.assigned.every(validScoutRoom)
    && natural(value.assignmentIndex) && value.assignmentIndex <= value.assigned.length;
}
function avoids(value: unknown): boolean {
  return object(value) && Object.keys(value).length <= 64 && Object.entries(value).every(([room,tick]) => validScoutRoom(room) && natural(tick));
}
export function validScoutControl(value: unknown): value is ScoutControl {
  if (!object(value) || !validExecution(value)) return false;
  return text(value.id) && value.id.length <= 200 && validScoutRoom(value.home) && phases.includes(value.phase)
    && counters(value) && navigation(value) && assignments(value) && avoids(value.avoidUntil);
}
export const scoutControlsSchema: StateSchema<ScoutControls> = {
  owner: 'scout-control', version: 1, initial: () => ({ units: [] }), migrations: {},
  valid: (value): value is ScoutControls => object(value) && Array.isArray(value.units) && value.units.length <= 512
    && value.units.every(validScoutControl) && new Set(value.units.map(unit => unit.id)).size === value.units.length,
};
