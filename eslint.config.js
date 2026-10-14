import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dist-*', 'node_modules', 'public', 'playwright-report', 'test-results', 'reports', 'src/mocks/fixtures/catalog.generated.json'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': ['error', { selector: "CallExpression[callee.name='fetch']", message: 'Use o cliente Axios (src/api/client.ts) para chamadas REST.' }],
    },
  },
  {
    // a camada de mocks é "servidor": pode usar fetch/Response e tipos mais soltos
    files: ['src/mocks/**', 'e2e/**', 'scripts/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
)
