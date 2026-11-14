import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const allowed = {
  core: ['core'],
  world: ['core', 'world'],
  persistence: ['core', 'persistence'],
  config: ['core', 'config'],
  capabilities: ['core', 'capabilities', 'world'],
  features: ['core', 'capabilities', 'features', 'world', 'persistence', 'config'],
  adapters: ['core', 'capabilities', 'world', 'persistence', 'config', 'adapters'],
  app: ['core', 'capabilities', 'features', 'world', 'persistence', 'config', 'adapters', 'app'],
};
const root = path.resolve('src');
const errors = [];
const files = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('.ts'));
for (const file of files) {
  const absolute = path.join(root, file);
  const owner = file.split(path.sep)[0];
  const permitted = file === 'main.ts' ? ['app', 'adapters', 'config'] : allowed[owner];
  if (!permitted) { errors.push(`${file}: unknown architecture layer`); continue; }
  const source = ts.createSourceFile(file, fs.readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true);
  function checkImport(specifier) {
    if (!specifier.startsWith('.')) { errors.push(`${file}: external/aliased import ${specifier}`); return; }
    const relative = path.relative(root, path.resolve(path.dirname(absolute), specifier));
    const target = relative.split(path.sep)[0];
    if (!permitted.includes(target)) errors.push(`${file}: ${owner} cannot import ${relative}`);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      checkImport(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) checkImport(argument.text);
      else errors.push(`${file}: computed module loading is not allowed`);
    }
    if (owner === 'core' && ts.isIdentifier(node) && ['Game', 'Memory', 'RawMemory', 'PathFinder'].includes(node.text)) {
      errors.push(`${file}: game global ${node.text} in pure core`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Architecture boundaries passed for ${files.length} source files.`);
