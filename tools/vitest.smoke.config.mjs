import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Representative boundary contracts; feature changes also need their relevant test files.
const include = [
  "test/smoke/application.test.ts",
  "test/app/game-loop.test.ts",
  "test/config/resolve.test.ts",
  "test/core/execution/action-arbiter.test.ts",
  "test/persistence/versioned-state.test.ts",
  "test/persistence/tasks.test.ts",
  "test/capabilities/spawn-allocation.test.ts",
  "test/capabilities/path-service.test.ts",
  "test/capabilities/mining-cycle.test.ts",
  "test/capabilities/hauling-settlement.test.ts",
  "test/capabilities/work-selection.test.ts",
  "test/features/candidate-evaluator.test.ts",
  "test/features/construction-executor.test.ts",
  "test/features/lab-production.test.ts",
  "test/features/boost-requests.test.ts"
];
const root = fileURLToPath(new URL('../', import.meta.url));
for (const file of include) {
  if (!existsSync(new URL('../'+file, import.meta.url))) throw new Error('Missing selected smoke test: '+file);
}
export default defineConfig({ root, test: { include } });
