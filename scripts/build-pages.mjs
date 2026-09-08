import { spawnSync } from 'node:child_process';
import { access, rename, rmdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/new-mok';
if (!/^\/[a-zA-Z0-9_-]+$/.test(basePath)) {
  throw new Error('Pages base path must be one repository name, e.g. /new-mok');
}
const build = spawnSync(process.execPath, ['scripts/build.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);

// Vinext writes prefixed assets on disk; Pages mounts the artifact at the
// repository path already, so the uploaded files must not repeat that prefix.
const output = resolve('dist/client');
await access(resolve(output, 'index.html'));
for (const game of ['ripple', 'erosion', 'legacy']) {
  await access(resolve(output, 'rules', `${game}.html`));
}
const prefixed = resolve(output, basePath.slice(1));
await rename(resolve(prefixed, '_next'), resolve(output, '_next'));
await rmdir(prefixed);
await writeFile(resolve(output, '.nojekyll'), '');
console.log(`GitHub Pages artifact ready at dist/client (URL base: ${basePath}/)`);
