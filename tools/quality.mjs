import { spawnSync } from 'node:child_process';
import path from 'node:path';
const python = path.resolve(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const result = spawnSync(python, ['tools/quality/lizard_check.py'], { stdio: 'inherit' });
if (result.error) throw new Error('Create .venv and install tools/quality/requirements.txt first.', { cause: result.error });
process.exitCode = result.status ?? 1;
