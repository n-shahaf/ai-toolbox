import { readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function loadManifest() {
  const text = await readFile(join(PKG_ROOT, 'manifest.json'), 'utf8');
  return JSON.parse(text);
}

export function filterByNames(items, csv) {
  if (!csv || csv === true) return items;
  const wanted = new Set(String(csv).split(',').map(s => s.trim()).filter(Boolean));
  const matched = items.filter(i => wanted.has(i.name));
  const missing = [...wanted].filter(n => !matched.find(i => i.name === n));
  if (missing.length) {
    throw new Error(`unknown names: ${missing.join(', ')}. Run \`ai-toolbox list\` to see available.`);
  }
  return matched;
}
