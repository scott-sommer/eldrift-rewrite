import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
export default defineConfig({
  files: ['src/**/*.ts', 'test/**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommended],
  rules: {
    'no-cond-assign': ['error', 'always'],
    'no-constant-condition': 'error',
    'use-isnan': 'error',
    'eqeqeq': ['error', 'always'],
  },
});
