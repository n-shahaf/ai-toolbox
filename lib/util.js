import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

export function sha256(text) {
  return 'sha256:' + createHash('sha256').update(text).digest('hex');
}

export async function readIfExists(path) {
  try { return await readFile(path, 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

export async function writeFileEnsuringDir(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
}

export async function pathExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { frontmatter: {}, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\n/, '');
  const fm = {};
  for (const raw of block.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    fm[key] = value;
  }
  return { frontmatter: fm, body };
}

export function serializeFrontmatter(fm, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (v == null) continue;
    if (Array.isArray(v)) lines.push(`${k}: [${v.map(x => `'${x}'`).join(', ')}]`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push('---');
  return lines.join('\n') + '\n' + body;
}

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
};
const useColor = process.stdout.isTTY && process.env.NO_COLOR == null;
export const color = new Proxy(C, {
  get: (t, k) => useColor ? t[k] : '',
});

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) flags[a.slice(2)] = argv[++i];
      else flags[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { positional, flags };
}
