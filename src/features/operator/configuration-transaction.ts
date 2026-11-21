import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import type { ConfigurationStore } from '../../config/provider';
import { operatorSchema } from './state';
/** Validate a detached complete candidate before one write; empty/idempotent edits never initialize state. */
export function editOperatorConfiguration(state: StatePort,edit: (saved: ConfigurationStore) => ConfigurationStore): boolean {
  const saved = peekState(state,'operator/config',operatorSchema) ?? {}, next = edit(copyPlain(saved));
  if (!operatorSchema.valid(next)) throw new Error('Invalid operator configuration');
  if (JSON.stringify(next) === JSON.stringify(saved)) return false;
  state.write('operator/config',{ owner: operatorSchema.owner,version: operatorSchema.version,data: copyPlain(next) }); return true;
}
