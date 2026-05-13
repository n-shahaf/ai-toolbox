import { loadManifest } from './manifest.js';
import { color } from './util.js';

export async function runList(flags) {
  const m = await loadManifest();
  const showAgents = flags.agents || (!flags.agents && !flags.skills);
  const showSkills = flags.skills || (!flags.agents && !flags.skills);

  if (showAgents) {
    process.stdout.write(`${color.bold}Agents${color.reset} (${m.agents.length})\n`);
    const pad = Math.max(...m.agents.map(a => a.name.length)) + 2;
    for (const a of m.agents) {
      process.stdout.write(`  ${color.cyan}${a.name.padEnd(pad)}${color.reset}${a.description}\n`);
    }
  }

  if (showSkills) {
    if (showAgents) process.stdout.write('\n');
    process.stdout.write(`${color.bold}Skills${color.reset} (${m.skills.length})\n`);
    const pad = Math.max(...m.skills.map(s => s.name.length)) + 2;
    for (const s of m.skills) {
      process.stdout.write(`  ${color.cyan}${s.name.padEnd(pad)}${color.reset}${s.description}\n`);
    }
  }
}
