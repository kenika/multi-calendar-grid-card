import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

// Parse CLI args for --outfile and --define:__VERSION__
let outfileArg;
let versionArg;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--outfile=')) {
    outfileArg = arg.slice('--outfile='.length);
  } else if (arg.startsWith('--define:__VERSION__=')) {
    versionArg = arg.slice('--define:__VERSION__='.length);
  }
}

const envName = process.env.BUILD_NAME;
const outfile = outfileArg || (envName ? `./dist/${envName}.js` : './dist/multi-calendar-grid-card.js');

await mkdir('./dist', { recursive: true });

const define = {};
if (versionArg) {
  try {
    define.__VERSION__ = JSON.stringify(JSON.parse(versionArg));
  } catch {
    define.__VERSION__ = JSON.stringify(versionArg);
  }
}

await build({
  entryPoints: ['./src/multi-calendar-grid-card.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile,
  define: Object.keys(define).length ? define : undefined,
});
