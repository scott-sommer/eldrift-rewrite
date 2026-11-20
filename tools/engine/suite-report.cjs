const fs = require('node:fs');
const path = require('node:path');
/** Replace stale success immediately; retain current progress even if a child or assertion fails. */
function createSuiteReport(file, now = () => performance.now()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const began = now();
  const report = { status: 'running', startedAt: new Date().toISOString(), milliseconds: 0,
    activeScenario: null, results: [] };
  function save() {
    report.milliseconds = now() - began;
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    return report;
  }
  save();
  return {
    begin(scenario) { report.activeScenario = scenario; save(); },
    completed(result) { report.results.push(result); report.activeScenario = null; save(); },
    finish() { report.status = 'passed'; report.activeScenario = null; return save(); },
    failed(error) { report.status = 'failed'; report.failure = String(error?.stack ?? error); return save(); },
  };
}
module.exports = { createSuiteReport };
