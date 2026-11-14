import { readFile } from 'node:fs/promises';
import { uploadRequest, sendUpload } from './deploy/request.mjs';
const [environment, confirmation] = process.argv.slice(2);
if (environment === 'live' && confirmation !== '--confirm-live') throw new Error('Live upload requires --confirm-live and separate user authorization.');
const source = await readFile('dist/main.js', 'utf8');
const request = uploadRequest(environment, source, process.env);
await sendUpload(request);
console.log(`Uploaded main to the configured ${environment} branch.`);
