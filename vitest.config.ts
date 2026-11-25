import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vite.config';

export default defineConfig((env) =>
  mergeConfig(typeof base === 'function' ? base(env) : base, {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  }),
);
