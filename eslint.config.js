import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // '.netlify' is Netlify CLI's own build-scaffolding dir (gitignored, not source) — excluded here
  // too since ESLint's directory walk otherwise errors on it if Windows Controlled Folder Access
  // has locked it (the same permissions issue documented in CLAUDE.md for the deploy path itself).
  globalIgnores(['dist', '.netlify']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
