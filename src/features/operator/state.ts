import type { StateSchema } from '../../persistence/versioned-state';
import { configurationFor } from '../../config/provider';
import type { ConfigurationStore } from '../../config/provider';
import { resolveConfig } from '../../config/resolve';
import { validatePatch } from '../../config/validation';
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function knownKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}
function validRooms(value: unknown): boolean {
  if (!object(value)) return false;
  return Object.values(value).every(room => object(room) && knownKeys(room, ['profile', 'override', 'temporary'])
    && (room.profile === undefined || typeof room.profile === 'string'));
}
function validShape(value: unknown): value is ConfigurationStore {
  if (!object(value) || !knownKeys(value, ['environment', 'empire', 'profiles', 'rooms'])) return false;
  if (value.profiles !== undefined && !object(value.profiles)) return false;
  return value.rooms === undefined || validRooms(value.rooms);
}
function valid(value: unknown): value is ConfigurationStore {
  if (!validShape(value)) return false;
  try {
    resolveConfig(configurationFor(value), 0);
    for (const profile of Object.values(value.profiles ?? {})) validatePatch(profile, 'profile');
    for (const room of Object.keys(value.rooms ?? {})) resolveConfig(configurationFor(value, room), 0);
    return true;
  } catch { return false; }
}
export const operatorSchema: StateSchema<ConfigurationStore> = {
  owner: 'operator', version: 1, initial: () => ({}), valid, migrations: {},
};
