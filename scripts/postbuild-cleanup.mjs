import { rm } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

const removeIfExists = async (relativePath) => {
  const fullPath = path.join(distDir, relativePath);
  await rm(fullPath, { recursive: true, force: true });
};

await removeIfExists('fixtures');
await removeIfExists('.DS_Store');
await removeIfExists('.htaccess-simple');

