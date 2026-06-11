import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/mcp/server.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the internal workspace package (ships TS source) into the output.
  noExternal: ['@bizsocial360/shared'],
});
