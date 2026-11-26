import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { NativeLaborProof } from './native-labor-model';
/** Publication owns operational Memory; older controlled scenarios may retain isolated state. */
export function nativeLaborTaskState(proof: NativeLaborProof) {
  return createMemoryPort(() => proof.publication ? Memory : proof.stagedTask!.root);
}
