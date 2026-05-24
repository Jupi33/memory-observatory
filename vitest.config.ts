import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    restoreMocks: true,
  },
})
