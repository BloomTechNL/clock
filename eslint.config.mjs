import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { files: ['scripts/**/*.mjs'], extends: [js.configs.recommended] },
  {
    files: ['{src,test}/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
);
