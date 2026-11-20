const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSuiteReport } = require('./suite-report.cjs');
test('current run replaces old success and retains partial evidence on assertion failure', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'eldrift-suite-report-'));
  const file = path.join(folder, 'report.json');
  try {
    const freshFile = path.join(folder, 'fresh', 'nested', 'report.json');
    const fresh = createSuiteReport(freshFile);
    assert.equal(JSON.parse(fs.readFileSync(freshFile, 'utf8')).status, 'running');
    fresh.finish();
    fs.writeFileSync(file, JSON.stringify({ status: 'passed', results: ['stale'] }));
    let clock = 10;
    const report = createSuiteReport(file, () => clock);
    const read = () => JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(read().status, 'running');
    assert.deepEqual(read().results, []);
    report.begin('first');
    report.completed({ scenario: 'first', evidence: 'first.json' });
    report.begin('second');
    clock = 35;
    report.failed(new Error('child assertion'));
    assert.equal(read().status, 'failed');
    assert.equal(read().activeScenario, 'second');
    assert.equal(read().milliseconds, 25);
    assert.match(read().failure, /child assertion/);
    assert.deepEqual(read().results, [{ scenario: 'first', evidence: 'first.json' }]);
    const next = createSuiteReport(file);
    assert.deepEqual(read().results, []);
    next.begin('replacement');
    next.completed({ scenario: 'replacement' });
    next.finish();
    assert.equal(read().status, 'passed');
    assert.equal(read().activeScenario, null);
  } finally {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
