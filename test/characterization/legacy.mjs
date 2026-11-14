import fs from 'node:fs';
import vm from 'node:vm';
const data = JSON.parse(fs.readFileSync(new URL('../fixtures/legacy/excerpts.json', import.meta.url), 'utf8'));
export function legacy(symbols, globals = {}) {
  const context = vm.createContext(globals);
  vm.runInContext(symbols.map(name => data.fixtures[name].source).join('\n'), context);
  return context;
}
