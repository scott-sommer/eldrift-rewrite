import { build } from 'esbuild';
await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: 'external',
  sourcesContent: true,
  logLevel: 'info',
});
