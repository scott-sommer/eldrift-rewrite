import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const root = process.argv[2];
const legacySha = 'f2bbf7e8c44addc7c426abb5458e393c9502ff5f';
const cases = [];
for (const [file, line, kind] of [['role.hunter.js', 88, 'assignment'], ['utilV2.js', 2547, 'nan'], ['controller.js', 1031, 'generalDispatch'], ['controller.js', 1122, 'specialDispatch']]) {
  const source = execFileSync('git', ['show', `${legacySha}:${file}`], { cwd: root, encoding: 'utf8' });
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let condition;
  function visit(node) {
    if (ts.isIfStatement(node) && ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1 === line) condition = node.expression.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!condition) throw new Error(`No condition at ${file}:${line}`);
  cases.push({ file, line, kind, condition });
}
fs.writeFileSync('test/fixtures/legacy/conditions.json', JSON.stringify({ legacySha, evidence: 'isolated predicate execution plus source inspection; surrounding runtime not executed', cases }, null, 2) + '\n');
