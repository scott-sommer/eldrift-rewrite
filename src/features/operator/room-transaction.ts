import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { operatorSchema } from './state';
import type { ConfigurationStore } from '../../config/provider';
export type OperatorRoomSettings = NonNullable<ConfigurationStore['rooms']>[string];
export interface OperatorRoomEdit { home: string; apply(settings: OperatorRoomSettings): OperatorRoomSettings }
export function validateOperatorHome(home: string): void { if (typeof home !== 'string' || !/^[WE]\d+[NS]\d+$/.test(home)) throw new Error('Invalid room name'); }
export function validateOperatorHomes(homes: readonly string[]): void {
  if (!Array.isArray(homes) || homes.length > 50 || new Set(homes).size !== homes.length) throw new Error('Invalid bulk room list; maximum 50 distinct rooms');
  homes.forEach(validateOperatorHome);
}
function replaceRoom(rooms: Record<string,OperatorRoomSettings>,edit: OperatorRoomEdit): void {
  const updated = edit.apply(copyPlain(rooms[edit.home] ?? {}));
  if (updated.override && !Object.keys(updated.override).length) delete updated.override;
  if (Object.keys(updated).length) rooms[edit.home] = updated; else delete rooms[edit.home];
}
/** Validate every room and the whole resulting configuration before one durable write. */
export function editOperatorRooms(state: StatePort,edits: readonly OperatorRoomEdit[],owns: (home: string) => boolean): boolean {
  validateOperatorHomes(edits.map(edit => edit.home));
  if (edits.some(edit => !owns(edit.home))) throw new Error('Visible owned room is required');
  if (!edits.length) return false;
  const saved = peekState(state,'operator/config',operatorSchema) ?? {}, rooms = { ...saved.rooms };
  for (const edit of edits) replaceRoom(rooms,edit);
  const next: ConfigurationStore = { ...saved,rooms }; if (!Object.keys(rooms).length) delete next.rooms;
  if (!operatorSchema.valid(next)) throw new Error('Invalid operator configuration');
  if (JSON.stringify(next) === JSON.stringify(saved)) return false;
  state.write('operator/config',{ owner: operatorSchema.owner,version: operatorSchema.version,data: copyPlain(next) }); return true;
}
