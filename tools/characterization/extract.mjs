import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const root = process.argv[2];
if (!root) throw new Error('Pass the read-only legacy checkout path');
const fixturePath = 'test/fixtures/legacy/excerpts.json';
const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (sha !== data.legacySha) throw new Error('Legacy baseline differs');
const specs = {
  'utilV2.js': ['processClaimFlags', 'processMiningFlags'],
  'role.minerV2.js': ['isTrackedRemoteMiner', 'updateRemoteReachability'],
  'role.courierV3.js': ['STATUS_IDLE', 'clearRecoverySupportMemory', 'getRecoveryEnergySource', 'getRecoveryEnergyDropoff', 'runRecoverySupportCourier'],
  'room.layout.shared.js': ['TRANSFORMS', 'transformRelative', 'normalizeCoreTemplate', 'worldFromRelative', 'anchorFromWorld', 'sortEntries', 'buildKey'],
  'spawner.js': ['buildRoadScavengerBody', 'getCarryCapacityForBody'],
  'room.energy.recovery.js': ['ensureRecoveryMemory', 'getStoredEnergy', 'isEligibleRecoveryRoom', 'getDonorRooms', 'refreshRecoveryStates', 'RECOVERY_TRIGGER_ENERGY', 'RECOVERY_EXIT_ENERGY', 'RECOVERY_DONOR_MAX_DISTANCE', 'RECOVERY_DONOR_MIN_ENERGY', 'RECOVERY_SUPPORT_BATCH'],
};
for (const [file, symbols] of Object.entries(specs)) {
  // Read committed bytes, not potentially edited working-tree source.
  const source = execFileSync('git', ['show', `${sha}:${file}`], { cwd: root, encoding: 'utf8' });
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const symbol of symbols) {
    const node = ast.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === symbol));
    if (!node) throw new Error(`Missing ${file}:${symbol}`);
    const excerpt = node.getText(ast);
    data.fixtures[symbol] = { file, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, source: excerpt, sha256: crypto.createHash('sha256').update(excerpt).digest('hex') };
  }
}
fs.writeFileSync(path.resolve(fixturePath), JSON.stringify(data, null, 2) + '\n');

