import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import ts from 'typescript';
const root = process.argv[2];
const file = 'test/fixtures/legacy/excerpts.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const specs = [
  ['defend.js', 'checkSafeMode', 'oldSafeMode'],
  ['defenseManager.js', 'checkSafeMode', 'managerSafeMode'],
  ['resourceManager.js', 'getLabRooms', 'getLabRooms'],
  ['resourceManager.js', 'get10LabRooms', 'get10LabRooms'],
];
for (const [filename, symbol, alias] of specs) {
  const source = execFileSync('git', ['show', `${data.legacySha}:${filename}`], { cwd: root, encoding: 'utf8' });
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let match;
  function visit(node) {
    if ((ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) && node.name.getText(ast) === symbol && node.initializer && ts.isFunctionExpression(node.initializer)) match = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!match) throw new Error(`Missing ${symbol}`);
  const raw = match.initializer.getText(ast);
  data.fixtures[alias] = { file: filename, line: ast.getLineAndCharacterOfPosition(match.getStart(ast)).line + 1, source: `var ${alias} = ${raw};`, extraction: 'function expression unchanged; binding renamed for isolated execution', sha256: crypto.createHash('sha256').update(`var ${alias} = ${raw};`).digest('hex') };
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
