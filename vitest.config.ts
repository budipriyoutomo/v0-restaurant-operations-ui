import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Unit tests for pure lib/ logic (Todo-Pilot §12 starts here). No DOM needed yet.
export default defineConfig({
  test: { include: ['lib/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname) } },
})
