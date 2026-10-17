import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig([
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,mts}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y, 'unused-imports': unusedImports },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...Object.fromEntries(Object.entries(jsxA11y.configs.recommended.rules).map(([rule, setting]) => [rule, Array.isArray(setting) ? ['warn', ...setting.slice(1)] : 'warn'])),
      'jsx-a11y/label-has-for': 'off',
      'jsx-a11y/label-has-associated-control': ['warn', { assert: 'either' }],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-children-prop': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'no-undef': 'off',
      'unused-imports/no-unused-imports': 'error',
      // Retain the high-value Next.js performance checks without the
      // vulnerable @next/eslint-plugin-next -> fast-glob -> braces chain.
      'no-restricted-syntax': ['warn',
        { selector: 'JSXElement[openingElement.name.name="img"]', message: 'Use next/image for optimized images.' },
        { selector: 'JSXOpeningElement[name.name="a"] > JSXAttribute[name.name="href"][value.type="Literal"][value.value=/^\\//]', message: 'Use next/link for internal navigation.' },
        { selector: 'JSXOpeningElement[name.name="script"] > JSXAttribute[name.name="async"]', message: 'Use next/script for application scripts.' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: { parser: tsParser, parserOptions: { sourceType: 'module', ecmaFeatures: { jsx: true } } },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'node_modules/**']),
]);
