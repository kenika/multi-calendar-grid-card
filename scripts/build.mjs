import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

// Parse CLI args for --outfile, --define:__VERSION__, and --no-sourcemap
let outfileArg;
let versionArg;
let sourcemap = true;

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--outfile=')) {
    outfileArg = arg.slice('--outfile='.length);
  } else if (arg.startsWith('--define:__VERSION__=')) {
    versionArg = arg.slice('--define:__VERSION__='.length);
  } else if (arg === '--no-sourcemap' || arg === '--sourcemap=false') {
    sourcemap = false;
  }
}

// Allow disabling sourcemaps via env var
const envSourcemap = process.env.SOURCEMAP;
if (envSourcemap === 'false' || envSourcemap === '0') {
  sourcemap = false;
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
  sourcemap,
  outfile,
  define: Object.keys(define).length ? define : undefined,
});
