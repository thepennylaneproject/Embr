/**
 * vitest.config.ts
 *
 * Separate vitest configuration that does not import @vitejs/plugin-react.
 * The React plugin is only needed for the Vite dev server (vite.config.ts)
 * and is an ESM-only package that cannot be loaded by vitest's CJS bundler
 * in this environment.
 *
 * Tests (pure TypeScript services, lib modules) do not need React at all.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/*.test.ts',
      'netlify/functions/**/__tests__/**/*.test.ts',
      'netlify/functions/**/*.test.ts',
    ],
  },
});
