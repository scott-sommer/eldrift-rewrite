const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cases = ['', '--reload', '--actions', '--stations', '--mining', '--mining-work', '--colony-mining', '--colony-mineral', '--mining-replacement', '--mining-saturation', '--extractor-fault', '--mining-interrupted', '--specialist-mining', '--mineral-depletion', '--mineral-capacity', '--spawn', '--spawn-contention', '--tasks', '--work', '--resources', '--transfer-confirmation', '--hauling-cycle', '--energy-logistics', '--courier-bootstrap', '--courier-routes', '--colony-economy', '--empty-source', '--cargo-recovery', '--expiry-recovery', '--unknown-recovery', '--unknown-delivery', '--missing-sink', '--pickup-admission', '--remains-supply', '--drop-supply', '--large-drop', '--preservation', '--source-loss', '--movement', '--maintenance', '--retirement', '--paths', '--recovery', '--traffic', '--exits', '--navigation', '--unseen', '--occupied-exit', '--service-recovery', '--inject-error', '--inject-timeout'];
const results = [];
const start = performance.now();
for (const scenario of cases) {
  const began = performance.now();
  const child = spawnSync(process.execPath, [path.join(__dirname, 'smoke.cjs'), ...(scenario ? [scenario] : [])], { encoding: 'utf8', timeout: 90000, windowsHide: true });
  const marker = child.stdout?.match(/^ENGINE_EVIDENCE (.+)$/m);
  assert.ok(marker, `Missing evidence for ${scenario}: ${child.error ?? child.stderr}`);
  const evidence = JSON.parse(fs.readFileSync(marker[1].trim(), 'utf8'));
  const negative = scenario.startsWith('--inject-');
  assert.equal(child.status, negative ? 1 : 0, `${scenario}: ${child.stderr}`);
  assert.equal(evidence.status, negative ? 'failed' : 'passed');
  if (scenario === '--inject-error') assert.ok(evidence.errors.some(error => error.includes('ENGINE_SENTINEL')));
  if (scenario === '--inject-timeout') assert.match(evidence.failure, /Engine smoke timeout/);
  results.push({ scenario: scenario || 'packaged-smoke', milliseconds: performance.now() - began, evidence: marker[1].trim(), expectedFailure: negative });
  console.log(`${scenario || 'packaged-smoke'}: passed`);
}
const report = { milliseconds: performance.now() - start, results };
fs.writeFileSync(path.resolve(__dirname, '../../artifacts/engine-suite.json'), JSON.stringify(report, null, 2));
console.log(`Engine suite: ${results.length} checks in ${(report.milliseconds / 1000).toFixed(2)}s`);
