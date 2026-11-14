import { readFile } from 'node:fs/promises';
import { tracePosition } from './source-position.mjs';
const [file, line, column] = process.argv.slice(2);
if (!file) throw new Error('Usage: npm run trace -- dist/main.js.map LINE COLUMN');
const result = tracePosition(JSON.parse(await readFile(file, 'utf8')), Number(line), Number(column));
console.log(`${result.source}:${result.line}:${result.column}`);
