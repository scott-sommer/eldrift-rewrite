const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createSuiteReport } = require('./suite-report.cjs');
const { compareStampBudgetPlans } = require('./stamp-budget.cjs');
const cases = ['', '--reload', '--actions', '--stations', '--mining', '--mining-storage', '--mining-work', '--colony-mining', '--colony-mineral', '--mining-replacement', '--mining-saturation', '--extractor-fault', '--mining-interrupted', '--specialist-mining', '--mineral-depletion', '--mineral-capacity', '--spawn', '--spawn-contention', '--tasks', '--work', '--work-selection', '--room-assessment', '--intel-observation', '--intel-capture', '--observer-runtime', '--scout-lifecycle', '--scout-control', '--scout-spawn', '--scout-default', '--scout-explore', '--scout-blocked', '--scout-fallback', '--remote-assessment', '--remote-reservation', '--reservation-quote', '--room-reservation', '--reservation-selection', '--reservation-population', '--reservation-population-admission', '--reservation-population-cancel', '--remote-pipeline', '--reservation-vision', '--remote-capacity-idle', '--remote-capacity-starved', '--remote-capacity-busy', '--remote-capacity-off', '--remote-reachability-arrival', '--remote-reachability-blocked', '--remote-reachability-withdraw', '--remote-startup-staged', '--remote-startup-refusal', '--remote-startup-admission', '--remote-startup-selected', '--remote-startup-selection-expiry', '--remote-mining', '--remote-banking', '--remote-banking-sink-loss', '--remote-banking-gap', '--remote-banking-full', '--remote-transport', '--remote-transport-threat', '--remote-transport-contention', '--remote-transport-drops', '--remote-infrastructure', '--remote-management', '--remote-runtime', '--remote-fleet', '--remote-fleet-cancel', '--remote-fleet-replacement', '--remote-fleet-damage', '--remote-fleet-budget', '--remote-fleet-bootstrap', '--remote-fleet-lifetime', '--remote-fleet-border', '--remote-fleet-migration', '--remote-return', '--remote-road-work', '--remote-road-auto', '--remote-road-admission', '--layout-placement', '--planning-route-resume', '--planning-route-reload', '--planning-commit', '--standard-draft-resume', '--constrained-draft-resume', '--planning-job', '--planning-cpu', '--planning-runtime', '--planning-budget', '--planning-room', '--construction', '--construction-runtime', '--construction-lifecycle', '--construction-budget', '--construction-remote', '--construction-retry', '--defense-cut', '--defense-cut-reload', '--stamp-draft', '--stamp-room', '--auto-stamp-room', '--irregular-stamp-room', '--stamp-failure', '--stamp-budget', '--stamp-late-reset', '--work-dependencies', '--worker-runtime', '--worker-position', '--worker-position-wide', '--worker-population', '--mixed-workers', '--fortifier-work', '--legacy-fortifier', '--art-region', '--art-builder', '--energy-recovery', '--recovery-economy', '--recovery-scavenging', '--recovery-scavenger-spawn', '--recovery-banking', '--distributor-recovery', '--automatic-support', '--supply-replacement', '--supply-sponsor-loss', '--supply-terminal', '--supply-terminal-full', '--supply-target-loss', '--supply-fleet', '--supply-fleet-loss', '--supply-cycle', '--supply-cargo', '--supply-cargo-hold', '--supply-master', '--ground-recovery', '--ground-delivery', '--upgrade-supply-transport', '--support-transport', '--support-loss', '--support-reserve-change', '--upgrade-service', '--structure-actions', '--lab-reactions', '--lab-supply', '--lab-supply-depleted', '--lab-supply-switch', '--lab-supply-cancel', '--lab-reactions-invalid', '--lab-reactions-destroy', '--master-bootstrap', '--master-handoff', '--upgrade-master', '--master-layout-loss', '--master-storage-loss', '--master-loaded-loss', '--upgrade-master-contention', '--upgrade-fleet', '--upgrade-fleet-loss', '--upgrade-loss', '--bootstrap-harvest', '--bootstrap-assignment', '--bootstrap-salvage', '--bootstrap-salvage-disabled', '--bootstrap-salvage-depleted', '--upgrade-bootstrap', '--upgrade-rebuild', '--upgrade-cycle', '--upgrade-claim', '--upgrade-room', '--upgrade-room-shortage', '--worker-cargo', '--worker-cargo-drop', '--worker-cargo-hold', '--worker-collection', '--worker-miner', '--worker-miner-automatic', '--worker-miner-replacement', '--worker-miner-travel', '--worker-pickup', '--worker-profile-builder', '--worker-profile-fortifier', '--worker-profile-upgrader', '--worker-profile-upgrader-v2', '--worker-profile-hold', '--worker-profile-flag-hold', '--resources', '--transfer-confirmation', '--final-delivery', '--hauling-cycle', '--fixed-hauling', '--energy-logistics', '--reclamation', '--work-supply', '--tower-supply', '--link-supply', '--controller-links', '--link-contention', '--link-service', '--link-reversal', '--mineral-transport', '--courier-death', '--cargo-death', '--storage-loss', '--energy-banking', '--banking-fallback', '--banking-demand', '--store-fill', '--store-guard', '--store-drain', '--store-mineral', '--mineral-reload', '--mineral-recovery', '--mineral-recovery-fallback', '--courier-bootstrap', '--courier-routes', '--mineral-routes', '--colony-resilience', '--colony-economy', '--empty-source', '--cargo-recovery', '--expiry-recovery', '--expiry-delivery', '--unknown-recovery', '--unknown-delivery', '--missing-sink', '--pickup-admission', '--remains-supply', '--drop-supply', '--large-drop', '--preservation', '--full-sink', '--preservation-decay', '--source-loss', '--movement', '--maintenance', '--retirement', '--paths', '--recovery', '--traffic', '--exits', '--navigation', '--unseen', '--occupied-exit', '--service-recovery', '--inject-error', '--inject-timeout'];
const results = [];
const report = createSuiteReport(path.resolve(__dirname, '../../artifacts/engine-suite.json'));
try {
  for (const scenario of cases) {
    report.begin(scenario || 'packaged-smoke');
    const began = performance.now();
    const child = spawnSync(process.execPath, [path.join(__dirname, 'smoke.cjs'), ...(scenario ? [scenario] : [])], { encoding: 'utf8', timeout: scenario.startsWith('--remote-startup-') ? 1530000 : scenario.startsWith('--remote-reachability-') ? 450000 : scenario.startsWith('--remote-capacity-') ? 150000 : scenario === '--reservation-vision' ? 150000 : scenario === '--remote-pipeline' ? 210000 : scenario === '--reservation-population' ? 180000 : scenario === '--remote-fleet-lifetime' ? 330000 : scenario === '--remote-fleet-bootstrap' ? 180000 : 90000, windowsHide: true });
    const marker = child.stdout?.match(/^ENGINE_EVIDENCE (.+)$/m);
    assert.ok(marker, `Missing evidence for ${scenario}: ${child.error ?? child.stderr}`);
    const evidence = JSON.parse(fs.readFileSync(marker[1].trim(), 'utf8'));
    const negative = scenario.startsWith('--inject-');
    assert.equal(child.status, negative ? 1 : 0, `${scenario}: ${child.stderr}`);
    assert.equal(evidence.status, negative ? 'failed' : 'passed');
    if (scenario === '--inject-error') assert.ok(evidence.errors.some(error => error.includes('ENGINE_SENTINEL')));
    if (scenario === '--inject-timeout') assert.match(evidence.failure, /Engine smoke timeout/);
    if (scenario === '--stamp-late-reset') {
      const baseline = results.find(result => result.scenario === '--stamp-budget');
      assert.ok(baseline, 'default-budget baseline must precede late-reset comparison');
      compareStampBudgetPlans(JSON.parse(fs.readFileSync(baseline.evidence, 'utf8')).stampPlanning, evidence.stampPlanning);
    }
    if (scenario === '--defense-cut-reload') {
      const baseline = results.find(result => result.scenario === '--defense-cut');
      assert.ok(baseline, 'terrain baseline must precede reload comparison');
      const original = JSON.parse(fs.readFileSync(baseline.evidence, 'utf8')).defenseCut;
      assert.deepEqual(evidence.defenseCut.entries, original.entries, 'recovery must preserve complete staged barrier geometry');
    }
    results.push({ scenario: scenario || 'packaged-smoke', milliseconds: performance.now() - began, evidence: marker[1].trim(), expectedFailure: negative });
    report.completed(results.at(-1));
    console.log(`${scenario || 'packaged-smoke'}: passed`);
  }
  const final = report.finish();
  console.log(`Engine suite: ${results.length} checks in ${(final.milliseconds / 1000).toFixed(2)}s`);
} catch (error) {
  report.failed(error);
  throw error;
}


