// ESLint flat config (Todo-Review P2 #10): Next.js core web vitals + TypeScript.
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler readiness rules (eslint-plugin-react-hooks 7). The app
    // does not use the React Compiler and the flagged code is tested; keep
    // them visible as warnings and fix them when touching that code.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  globalIgnores([
    '.next/**', '.next-*/**', 'out/**', 'build/**', 'next-env.d.ts',
    'playwright-report/**', 'test-results/**', 'public/sw.js',
  ]),
])
