import { basename } from 'node:path';
import { parseFrontmatter, serializeFrontmatter } from './util.js';

// A target describes how a source file (agents/Foo.agent.md or skills/x/SKILL.md)
// maps to a destination path inside the consumer's repo, and how its frontmatter
// is rewritten for that tool's expected shape.

function agentBaseName(sourceFile) {
  return basename(sourceFile).replace(/\.agent\.md$/, '');
}

function skillDir(sourceFile) {
  // skills/<name>/SKILL.md -> <name>
  const m = sourceFile.match(/skills\/([^/]+)\/SKILL\.md$/);
  return m ? m[1] : null;
}

// --- claude (Claude Code) -----------------------------------------------------
// Agents:  .claude/agents/<lowercase-name>.md
// Skills:  .claude/skills/<skill-name>/SKILL.md
const claude = {
  name: 'claude',
  description: 'Claude Code — .claude/agents and .claude/skills',
  agentDest: (src) => `.claude/agents/${agentBaseName(src).toLowerCase()}.md`,
  skillDest: (src) => `.claude/skills/${skillDir(src)}/SKILL.md`,
  transformAgent(text) {
    // Claude Code accepts: name, description, model (sonnet|opus|haiku|inherit), tools.
    // Our files use Copilot-shaped model and tools; strip what Claude can't use.
    const { frontmatter, body } = parseFrontmatter(text);
    const out = {};
    if (frontmatter.name) out.name = frontmatter.name.toLowerCase();
    if (frontmatter.description) out.description = frontmatter.description;
    // Drop model/tools entirely — Claude Code will inherit from the parent.
    return serializeFrontmatter(out, body);
  },
  transformSkill(text) {
    return text; // skills are portable as-is
  },
};

// --- copilot (VS Code GitHub Copilot custom chat modes) -----------------------
// Agents:  .github/chatmodes/<name>.chatmode.md
// Skills:  .github/copilot-skills/<skill-name>/SKILL.md  (referenced by relative path in agents)
const copilot = {
  name: 'copilot',
  description: 'GitHub Copilot — .github/chatmodes (and .github/copilot-skills)',
  agentDest: (src) => `.github/chatmodes/${agentBaseName(src)}.chatmode.md`,
  skillDest: (src) => `.github/copilot-skills/${skillDir(src)}/SKILL.md`,
  transformAgent(text) {
    // The repo's frontmatter (description, model, tools) is already Copilot-shaped.
    // Pass through unchanged.
    return text;
  },
  transformSkill(text) {
    return text;
  },
};

// --- generic ------------------------------------------------------------------
// Agents:  <prefix>/agents/<name>.agent.md
// Skills:  <prefix>/skills/<skill-name>/SKILL.md
function generic(prefix = '.ai-toolbox') {
  return {
    name: 'generic',
    description: `Raw copy under ${prefix}/`,
    agentDest: (src) => `${prefix}/${src}`,
    skillDest: (src) => `${prefix}/${src}`,
    transformAgent: (t) => t,
    transformSkill: (t) => t,
  };
}

export function getTarget(name, opts = {}) {
  if (name === 'claude') return claude;
  if (name === 'copilot') return copilot;
  if (name === 'generic' || name == null) return generic(opts.prefix || '.ai-toolbox');
  throw new Error(`unknown target: ${name} (expected: claude | copilot | generic)`);
}

export function listTargets() {
  return [claude, copilot, generic()];
}
