import { rename, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const newNameArg = process.argv[2] || process.env.BUILD_NAME;
if (!newNameArg) {
  console.error('Usage: node scripts/rename-dist.mjs <new-name>');
  process.exit(1);
}

const newName = newNameArg.endsWith('.js') ? newNameArg : `${newNameArg}.js`;
const distDir = './dist';
const srcJs = join(distDir, 'multi-calendar-grid-card.js');
const srcMap = `${srcJs}.map`;
const destJs = join(distDir, newName);
const destMap = `${destJs}.map`;

await rename(srcJs, destJs);
await rename(srcMap, destMap);

const jsContent = await readFile(destJs, 'utf8');
const mapBase = basename(destMap);
const updated = jsContent.replace(/\/\/\# sourceMappingURL=.*/g, `//# sourceMappingURL=${mapBase}`);
await writeFile(destJs, updated);
