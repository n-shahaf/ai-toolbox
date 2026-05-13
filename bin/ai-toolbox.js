#!/usr/bin/env node
import { parseArgs } from '../lib/util.js';
import { runList } from '../lib/list.js';
import { runInit } from '../lib/init.js';
import { runSync } from '../lib/sync.js';

const HELP = `ai-toolbox — install reusable AI agents and skills into your project

Usage:
  npx @n-shahaf/ai-toolbox <command> [options]

Commands:
  list                       List available agents and skills
  init                       Install agents/skills into the current project
  sync                       Update previously-installed files from upstream
  help                       Show this help

Common options:
  --target <name>            claude | copilot | generic   (default: claude)
  --dir <path>               Working directory             (default: cwd)
  --agents <a,b,c>           Comma-separated subset; defaults to all
  --skills <a,b,c>           Comma-separated subset; defaults to all
  --prefix <path>            For --target generic: install prefix (default: .ai-toolbox)

init-only:
  --force                    Overwrite existing files

sync-only:
  --write                    Apply changes (default is dry-run)
  --force                    Overwrite locally-modified files
  --remote                   Pull latest files from GitHub (default: bundled)

Examples:
  npx @n-shahaf/ai-toolbox list
  npx @n-shahaf/ai-toolbox init --target claude
  npx @n-shahaf/ai-toolbox init --target copilot --agents Orchestrator,Developer
  npx @n-shahaf/ai-toolbox sync --write
  npx @n-shahaf/ai-toolbox sync --remote --write --force
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags } = parseArgs(rest);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    process.stdout.write(HELP);
    return;
  }
  switch (cmd) {
    case 'list': await runList(flags); break;
    case 'init': await runInit(flags); break;
    case 'sync': await runSync(flags); break;
    default:
      process.stderr.write(`unknown command: ${cmd}\n\n${HELP}`);
      process.exit(2);
  }
}

main().catch(e => {
  process.stderr.write(`error: ${e.message}\n`);
  process.exit(1);
});
