import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const outName = process.env.BUILD_NAME || 'multi-calendar-grid-card';
const outfile = `./dist/${outName}.js`;

await mkdir('./dist', { recursive: true });

await build({
  entryPoints: ['./src/multi-calendar-grid-card.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile,
});
