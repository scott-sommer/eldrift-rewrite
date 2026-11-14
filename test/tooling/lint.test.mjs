import { ESLint } from 'eslint';
import { expect, test } from 'vitest';
const eslint = new ESLint();

test('correctness lint rejects assignment in conditions and NaN equality', async () => {
  const [result] = await eslint.lintText('export function broken(x: number) { if (x = 1) return x === NaN; return false; }', { filePath: 'src/core/fixture.ts' });
  const rules = result.messages.map(message => message.ruleId);
  expect(rules).toContain('no-cond-assign');
  expect(rules).toContain('use-isnan');
  expect(result.errorCount).toBeGreaterThan(0);
});
