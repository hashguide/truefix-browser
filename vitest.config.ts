import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@types': path.resolve(__dirname, './src/common/types'),
      '@config': path.resolve(__dirname, './src/common/config'),
      '@api': path.resolve(__dirname, './src/api'),
      '@core': path.resolve(__dirname, './src/core'),
      '@ai': path.resolve(__dirname, './src/ai'),
      '@browser': path.resolve(__dirname, './src/browser'),
      '@workflows': path.resolve(__dirname, './src/workflows'),
      '@validators': path.resolve(__dirname, './src/validators'),
      '@storage': path.resolve(__dirname, './src/storage'),
      '@transport': path.resolve(__dirname, './src/transport'),
      '@logging': path.resolve(__dirname, './src/common/logging'),
    },
  },
})
