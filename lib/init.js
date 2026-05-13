import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadManifest, PKG_ROOT, filterByNames } from './manifest.js';
import { getTarget } from './targets.js';
import { color, sha256, readIfExists, writeFileEnsuringDir, pathExists } from './util.js';

const LOCKFILE = '.ai-toolbox.lock.json';

export async function runInit(flags) {
  const cwd = flags.dir ? resolve(flags.dir) : process.cwd();
  const targetName = flags.target || 'claude';
  const target = getTarget(targetName, { prefix: flags.prefix });
  const force = !!flags.force;

  const m = await loadManifest();
  const agents = filterByNames(m.agents, flags.agents);
  const skills = filterByNames(m.skills, flags.skills);

  process.stdout.write(
    `Installing ${color.bold}${agents.length}${color.reset} agent(s) and ${color.bold}${skills.length}${color.reset} skill(s) ` +
    `into ${color.cyan}${cwd}${color.reset} (target: ${color.bold}${target.name}${color.reset})\n\n`
  );

  const lockfile = {
    version: m.version,
    target: target.name,
    prefix: flags.prefix || null,
    installedAt: new Date().toISOString(),
    files: {},
  };

  let installed = 0, skipped = 0;
  for (const a of agents) {
    const dest = target.agentDest(a.file);
    const result = await copyOne(a.file, dest, cwd, target.transformAgent, force);
    record(lockfile, a.file, dest, result.sourceHash);
    log(result, dest); result.installed ? installed++ : skipped++;
  }
  for (const s of skills) {
    const dest = target.skillDest(s.file);
    const result = await copyOne(s.file, dest, cwd, target.transformSkill, force);
    record(lockfile, s.file, dest, result.sourceHash);
    log(result, dest); result.installed ? installed++ : skipped++;
  }

  await writeFile(join(cwd, LOCKFILE), JSON.stringify(lockfile, null, 2) + '\n');
  process.stdout.write(
    `\n${color.green}✓${color.reset} installed ${installed} file(s), skipped ${skipped} ` +
    `(${color.dim}use --force to overwrite${color.reset})\n` +
    `${color.green}✓${color.reset} wrote ${color.cyan}${LOCKFILE}${color.reset}\n`
  );
}

async function copyOne(sourceRel, destRel, cwd, transform, force) {
  const sourcePath = join(PKG_ROOT, sourceRel);
  const destPath = join(cwd, destRel);
  const sourceText = await readFile(sourcePath, 'utf8');
  const transformed = transform(sourceText);
  const sourceHash = sha256(transformed);

  const existing = await readIfExists(destPath);
  if (existing != null && !force) {
    return { installed: false, sourceHash, status: 'exists' };
  }
  await writeFileEnsuringDir(destPath, transformed);
  return { installed: true, sourceHash, status: existing == null ? 'new' : 'overwritten' };
}

function record(lockfile, sourceRel, destRel, sourceHash) {
  lockfile.files[sourceRel] = { dest: destRel, sourceHash };
}

function log(result, dest) {
  if (result.installed && result.status === 'new')          process.stdout.write(`  ${color.green}+ ${dest}${color.reset}\n`);
  else if (result.installed && result.status === 'overwritten') process.stdout.write(`  ${color.yellow}~ ${dest}${color.reset}\n`);
  else                                                      process.stdout.write(`  ${color.dim}= ${dest} (exists; use --force)${color.reset}\n`);
}
