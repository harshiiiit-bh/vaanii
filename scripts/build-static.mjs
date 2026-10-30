import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'public');

const rootFiles = [
  'index.html',
  'exam.html',
  'manifest.webmanifest',
  'metadata.json',
  'sitemap.xml',
  'sw.js'
];
const staticDirectories = ['assets', 'data', 'js'];

async function copyRequiredFile(file) {
  const source = path.join(rootDir, file);
  const destination = path.join(outputDir, file);
  const info = await stat(source).catch(() => null);
  if (!info?.isFile()) {
    throw new Error('Required frontend file is missing: ' + file);
  }
  await cp(source, destination);
}

async function copyRequiredDirectory(directory) {
  const source = path.join(rootDir, directory);
  const info = await stat(source).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error('Required frontend directory is missing: ' + directory);
  }
  await cp(source, path.join(outputDir, directory), { recursive: true });
}

async function copyStylesheets() {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const stylesheets = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.css'))
    .filter(entry => entry.name.startsWith('styles') || entry.name.startsWith('vaani-'))
    .map(entry => entry.name)
    .sort();

  if (!stylesheets.includes('styles.css')) {
    throw new Error('Required stylesheet styles.css is missing.');
  }

  for (const file of stylesheets) {
    await cp(path.join(rootDir, file), path.join(outputDir, file));
  }
}

async function countFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    count += entry.isDirectory() ? await countFiles(fullPath) : 1;
  }
  return count;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of rootFiles) await copyRequiredFile(file);
for (const directory of staticDirectories) await copyRequiredDirectory(directory);
await copyStylesheets();

for (const required of ['index.html', 'exam.html', 'js/app.js', 'data/pyq/manifest.js']) {
  const info = await stat(path.join(outputDir, required)).catch(() => null);
  if (!info?.isFile()) {
    throw new Error('Static artifact is missing a required entry: ' + required);
  }
}

const fileCount = await countFiles(outputDir);
console.log('Static deployment artifact ready: public/ (' + fileCount + ' files).');
