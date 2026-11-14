import type { StateSchema } from '../../persistence/versioned-state';
export interface ColonyState {
  room: string;
  owner: string;
  mode: 'bootstrap' | 'normal' | 'upgrade';
  recovery: { active: boolean; checkedAt: number | null };
}
function recovery(value: unknown): value is ColonyState['recovery'] {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<ColonyState['recovery']>;
  return typeof state.active === 'boolean' && (state.checkedAt === null || (typeof state.checkedAt === 'number' && Number.isSafeInteger(state.checkedAt) && state.checkedAt >= 0));
}
export function colonySchema(room: string, owner: string): StateSchema<ColonyState> {
  if (!room || !owner) throw new Error('Colony identity is required');
  return {
    owner: 'colony', version: 1, migrations: {},
    initial: () => ({ room, owner, mode: 'bootstrap', recovery: { active: false, checkedAt: null } }),
    valid(value: unknown): value is ColonyState {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<ColonyState>;
      return state.room === room && typeof state.owner === 'string' && state.owner.length > 0
        && ['bootstrap', 'normal', 'upgrade'].includes(state.mode ?? '') && recovery(state.recovery);
    },
  };
}
