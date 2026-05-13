import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadManifest, PKG_ROOT } from './manifest.js';
import { getTarget } from './targets.js';
import { color, sha256, readIfExists, writeFileEnsuringDir } from './util.js';

const LOCKFILE = '.ai-toolbox.lock.json';
const GIT_URL = 'https://github.com/n-shahaf/ai-toolbox.git';

export async function runSync(flags) {
  const cwd = flags.dir ? resolve(flags.dir) : process.cwd();
  const lockPath = join(cwd, LOCKFILE);
  const lockText = await readIfExists(lockPath);
  if (!lockText) {
    throw new Error(`no ${LOCKFILE} found in ${cwd}. Run \`ai-toolbox init\` first.`);
  }
  const lockfile = JSON.parse(lockText);
  const target = getTarget(flags.target || lockfile.target, { prefix: flags.prefix || lockfile.prefix });
  const write = !!flags.write;
  const force = !!flags.force;

  const sourceRoot = flags.remote ? await cloneRemote() : PKG_ROOT;
  const manifestText = await readFile(join(sourceRoot, 'manifest.json'), 'utf8');
  const m = JSON.parse(manifestText);

  process.stdout.write(
    `Syncing from ${color.bold}${flags.remote ? 'GitHub (latest)' : 'bundled (' + m.version + ')'}${color.reset} ` +
    `into ${color.cyan}${cwd}${color.reset} (target: ${color.bold}${target.name}${color.reset})\n` +
    `Mode: ${write ? color.yellow + 'WRITE' + color.reset : color.dim + 'dry-run (use --write)' + color.reset}\n\n`
  );

  const items = [
    ...m.agents.map(a => ({ kind: 'agent', source: a.file, transform: target.transformAgent, dest: target.agentDest(a.file) })),
    ...m.skills.map(s => ({ kind: 'skill', source: s.file, transform: target.transformSkill, dest: target.skillDest(s.file) })),
  ];

  const buckets = { unchanged: [], upstream: [], localOnly: [], conflict: [], missing: [], orphan: [] };

  for (const it of items) {
    const sourceText = await readFile(join(sourceRoot, it.source), 'utf8');
    const transformed = it.transform(sourceText);
    const sourceHash = sha256(transformed);
    const lockEntry = lockfile.files[it.source];
    const installedHash = lockEntry?.sourceHash;
    const destPath = lockEntry?.dest || it.dest;
    const localText = await readIfExists(join(cwd, destPath));
    const localHash = localText == null ? null : sha256(localText);

    if (localText == null) buckets.missing.push({ ...it, sourceText: transformed, sourceHash, destPath });
    else if (sourceHash === localHash) buckets.unchanged.push({ ...it, destPath });
    else if (installedHash && installedHash === localHash) buckets.upstream.push({ ...it, sourceText: transformed, sourceHash, destPath });
    else if (installedHash && installedHash === sourceHash) buckets.localOnly.push({ ...it, sourceText: transformed, sourceHash, destPath });
    else buckets.conflict.push({ ...it, sourceText: transformed, sourceHash, destPath });
  }

  // Orphans: files in the lockfile that are no longer in the manifest
  const sources = new Set(items.map(i => i.source));
  for (const src of Object.keys(lockfile.files)) {
    if (!sources.has(src)) buckets.orphan.push({ source: src, destPath: lockfile.files[src].dest });
  }

  // Summary
  const counts = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
  process.stdout.write(
    `  ${color.dim}unchanged${color.reset}     ${counts.unchanged}\n` +
    `  ${color.green}new (missing)${color.reset} ${counts.missing}${counts.missing ? '  (will install)' : ''}\n` +
    `  ${color.yellow}upstream${color.reset}      ${counts.upstream}${counts.upstream ? '  (will update)' : ''}\n` +
    `  ${color.cyan}local-only${color.reset}    ${counts.localOnly}  ${color.dim}(you customized; left alone)${color.reset}\n` +
    `  ${color.red}conflict${color.reset}      ${counts.conflict}${counts.conflict ? `  (need ${color.bold}--force${color.reset})` : ''}\n` +
    `  ${color.dim}orphan${color.reset}        ${counts.orphan}${counts.orphan ? '  (removed upstream)' : ''}\n\n`
  );

  for (const f of buckets.missing)   process.stdout.write(`  ${color.green}+ ${f.destPath}${color.reset}\n`);
  for (const f of buckets.upstream)  process.stdout.write(`  ${color.yellow}~ ${f.destPath}${color.reset}\n`);
  for (const f of buckets.conflict)  process.stdout.write(`  ${color.red}! ${f.destPath}${color.reset} ${color.dim}(both modified)${color.reset}\n`);
  for (const f of buckets.localOnly) process.stdout.write(`  ${color.cyan}* ${f.destPath}${color.reset} ${color.dim}(local change)${color.reset}\n`);
  for (const f of buckets.orphan)    process.stdout.write(`  ${color.dim}- ${f.destPath} (orphan)${color.reset}\n`);
  process.stdout.write('\n');

  if (!write) {
    process.stdout.write(`${color.dim}dry-run — pass --write to apply${color.reset}\n`);
    if (flags.remote) await cleanupClone(sourceRoot);
    return;
  }

  let applied = 0;
  for (const f of [...buckets.missing, ...buckets.upstream]) {
    await writeFileEnsuringDir(join(cwd, f.destPath), f.sourceText);
    lockfile.files[f.source] = { dest: f.destPath, sourceHash: f.sourceHash };
    applied++;
  }
  if (force) {
    for (const f of [...buckets.conflict, ...buckets.localOnly]) {
      await writeFileEnsuringDir(join(cwd, f.destPath), f.sourceText);
      lockfile.files[f.source] = { dest: f.destPath, sourceHash: f.sourceHash };
      applied++;
    }
  } else if (buckets.conflict.length) {
    process.stdout.write(`${color.yellow}note:${color.reset} ${buckets.conflict.length} conflict(s) skipped. Re-run with --force to overwrite.\n`);
  }
  lockfile.version = m.version;
  lockfile.installedAt = new Date().toISOString();
  await writeFile(lockPath, JSON.stringify(lockfile, null, 2) + '\n');
  process.stdout.write(`\n${color.green}✓${color.reset} applied ${applied} change(s); updated ${color.cyan}${LOCKFILE}${color.reset}\n`);

  if (flags.remote) await cleanupClone(sourceRoot);
}

async function cloneRemote() {
  const dir = await mkdtemp(join(tmpdir(), 'ai-toolbox-'));
  await runCmd('git', ['clone', '--depth', '1', GIT_URL, dir]);
  return dir;
}

async function cleanupClone(dir) {
  try { await rm(dir, { recursive: true, force: true }); } catch {}
}

function runCmd(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('close', code => code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`)));
    p.on('error', rej);
  });
}
