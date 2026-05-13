#!/usr/bin/env node
// Regenerates manifest.json from frontmatter in agents/ and skills/.
// Run: node scripts/build-manifest.js

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end < 0) return {};
  const block = text.slice(3, end).trim();
  const out = {};
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
    out[key] = value;
  }
  return out;
}

async function listFiles(dir, suffix) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await listFiles(full, suffix));
    else if (e.isFile() && full.endsWith(suffix)) out.push(full);
  }
  return out;
}

async function buildAgents() {
  const files = await listFiles(join(ROOT, 'agents'), '.agent.md');
  files.sort();
  const out = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm.name) {
      console.warn(`skip (no name): ${relative(ROOT, file)}`);
      continue;
    }
    out.push({
      name: fm.name,
      file: relative(ROOT, file).replace(/\\/g, '/'),
      description: fm.description || '',
      model: fm.model || null,
      tools: Array.isArray(fm.tools) ? fm.tools : (fm.tools ? [fm.tools] : []),
    });
  }
  return out;
}

async function buildSkills() {
  const skillsRoot = join(ROOT, 'skills');
  const out = [];
  let dirs;
  try { dirs = await readdir(skillsRoot, { withFileTypes: true }); } catch { return out; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const file = join(skillsRoot, d.name, 'SKILL.md');
    try { await stat(file); } catch { continue; }
    const text = await readFile(file, 'utf8');
    const fm = parseFrontmatter(text);
    out.push({
      name: fm.name || d.name,
      file: relative(ROOT, file).replace(/\\/g, '/'),
      description: fm.description || '',
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

async function main() {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8').catch(() => '{"version":"0.0.0"}'));
  const manifest = {
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    agents: await buildAgents(),
    skills: await buildSkills(),
  };
  await writeFile(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifest.json: ${manifest.agents.length} agents, ${manifest.skills.length} skills`);
}

main().catch(e => { console.error(e); process.exit(1); });
