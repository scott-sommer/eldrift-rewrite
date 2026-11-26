const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { dirname } = require('node:path');
function pathProbeOptions(root) {
  const probe = `${root.replaceAll('\\','/')}/test/engine/pipeline-path-probe.ts`;
  return {
    define: { 'PathFinder.search': 'pathProbeSearch' }, inject: [probe],
    plugins: [{ name: 'diagnostic-matrix-observation', setup(build) {
      build.onLoad({ filter: /[\\/]adapters[\\/]screeps[\\/]cost-matrix\.ts$/ },async args => {
        const source = await readFile(args.path,'utf8');
        const marker = 'export function observeCostMatrix(roomName: string, options: MatrixOptions, read = nativeCostObservations)';
        assert.equal(source.split(marker).length,2,'diagnostic transform requires exactly one known observation boundary');
        const contents = `import { measureMatrixObservation } from ${JSON.stringify(probe)};\n`
          +source.replace(marker,'function unmeasuredCostMatrix(roomName: string, options: MatrixOptions, read = nativeCostObservations)')
          +'\nexport function observeCostMatrix(roomName: string, options: MatrixOptions, read = nativeCostObservations) { return measureMatrixObservation(roomName,() => unmeasuredCostMatrix(roomName,options,read)); }\n';
        return { contents,loader: 'ts',resolveDir: dirname(args.path) };
      });
    } }],
  };
}
module.exports = { pathProbeOptions };
