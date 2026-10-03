import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Todo-Pilot §12. Two projects:
//   unit — pure lib/ logic and the zustand store (API mocked), plain Node
//   dom  — React components with React Testing Library in jsdom
const alias = { '@': path.resolve(__dirname) }

export default defineConfig({
  resolve: { alias },
  esbuild: { jsx: 'automatic' },
  test: {
    projects: [
      { resolve: { alias }, test: { name: 'unit', include: ['lib/**/*.test.ts'], environment: 'node' } },
      {
        resolve: { alias },
        esbuild: { jsx: 'automatic' },
        test: {
          name: 'dom',
          include: ['components/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
})
