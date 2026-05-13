# ai-toolbox

A reusable set of agents and skills for an LLM-driven dev workflow. Designed for GitHub Copilot, but the agent and skill files are plain Markdown with YAML frontmatter and can be loaded by any tool that understands that format.

## Install

This package is not published to npm — it lives only in this GitHub repo. Use `npx` with the `github:` shortcut to run the CLI directly from the repo:

```bash
# install all agents + skills into the current project
npx github:n-shahaf/ai-toolbox init --target claude     # → .claude/agents and .claude/skills
npx github:n-shahaf/ai-toolbox init --target copilot    # → .github/chatmodes and .github/copilot-skills
npx github:n-shahaf/ai-toolbox init --target cursor     # → .cursor/rules and .cursor/skills
npx github:n-shahaf/ai-toolbox init --target generic    # → .ai-toolbox/agents and .ai-toolbox/skills

# pick a subset
npx github:n-shahaf/ai-toolbox init --target claude --agents Orchestrator,Developer --skills token-discipline

# see what's available
npx github:n-shahaf/ai-toolbox list
```

For Cursor, agents land as `.cursor/rules/<name>.mdc` with `alwaysApply: false`, so they're opt-in via `@`-mention rather than injected into every turn.

`npx` clones the repo into its cache the first time you run it and reuses that clone on subsequent calls. No local install step, no npm registry.

**Prerequisites:** Node ≥ 18 and `git` on `PATH` (npm uses `git` under the hood to fetch from `github:` URLs).

**Pin a version** by appending `#branch`, `#tag`, or `#<sha>` to the URL:

```bash
npx github:n-shahaf/ai-toolbox#main init --target claude
npx github:n-shahaf/ai-toolbox#v0.1.0 init --target claude   # if a release is tagged
```

**`init` writes** a `.ai-toolbox.lock.json` in your project recording which files were installed and their content hash. Commit it so the next `sync` knows what changed where.

**Troubleshooting:** if `npx` keeps an old cached copy after you push an update, force a re-fetch with `npx -y github:n-shahaf/ai-toolbox ...`, or clear the npx cache entirely with `npm cache clean --force`.

<details>
<summary>Alternatives if you don't want npx</summary>

```bash
# Global install (stable `ai-toolbox` command on PATH)
npm install -g github:n-shahaf/ai-toolbox
ai-toolbox list

# Clone and run (for developing on the CLI itself)
git clone https://github.com/n-shahaf/ai-toolbox.git
node ai-toolbox/bin/ai-toolbox.js init --dir ~/my-project --target claude

# Pure copy (no CLI, no lockfile-based sync)
git clone --depth 1 https://github.com/n-shahaf/ai-toolbox.git /tmp/ai-toolbox
cp -r /tmp/ai-toolbox/agents /tmp/ai-toolbox/skills my-project/.claude/
```

</details>

## Update

```bash
# show what would change (default is dry-run)
npx github:n-shahaf/ai-toolbox sync

# apply non-conflicting updates (upstream-changed files; missing files)
npx github:n-shahaf/ai-toolbox sync --write

# pull the absolute latest from GitHub instead of the version bundled with the npx clone
npx github:n-shahaf/ai-toolbox sync --remote --write

# overwrite local customizations too (you'll lose those edits)
npx github:n-shahaf/ai-toolbox sync --write --force
```

The lockfile lets `sync` categorize each file:

| Status | Meaning | Default action |
|---|---|---|
| `unchanged` | source and local match | skip |
| `new (missing)` | in manifest, not on disk | install with `--write` |
| `upstream` | source changed, local matches the installed hash | install with `--write` |
| `local-only` | you customized; source is the same as when you installed | leave alone (`--force` to overwrite) |
| `conflict` | source AND local both differ from the installed hash | skip (`--force` to overwrite) |
| `orphan` | in lockfile but no longer in upstream | informational only |

This is the closest thing to "merge upstream into my version" without writing a real three-way merger — most of the time, conflicts will be rare because the toolbox files are reference material the consumer doesn't edit.

## What's inside

```
agents/                       # Specialist agents — one role per file
  Orchestrator.agent.md       # Master agent: classifies requests, delegates, schedules phases
  Planner.agent.md            # Produces file-scoped, ordered implementation plans
  Researcher.agent.md         # Surveys approaches and recommends one (no code)
  Developer.agent.md          # Implements non-trivial work — multi-file, public APIs, security-sensitive
  Developer-Lite.agent.md     # Cheaper sibling for single-file, low-risk edits; escalates when scope grows
  Debugger.agent.md           # Reproduces defects, isolates root cause, proposes minimal fix
  Reviewer.agent.md           # QA: reviews diffs for bugs, security, performance, quality
  PR-Fixer.agent.md           # Triages PR review comments, applies small fixes, escalates the rest
  Documenter.agent.md         # Updates README, CHANGELOG, docstrings to match code
  Tester.agent.md             # Builds and maintains test suites — MANUALLY INVOKED ONLY

skills/                       # Reusable knowledge agents reference by path
  token-discipline/SKILL.md   # Mandatory for every agent: token budget rules + operator check-in protocol
  code-quality/SKILL.md       # SOLID, patterns, code smells, review heuristics
  debugging/SKILL.md          # Reproduction, hypothesis testing, root-cause analysis
  documentation/SKILL.md      # Voice, structure, what belongs where
  security-scan/SKILL.md      # Repository-wide security scan (medium/high/critical only)
  testing/SKILL.md            # Test pyramid, behavior-vs-implementation, determinism, mocking
  pr-comment-triage/SKILL.md  # Comment taxonomy, actionable-vs-defer rubric, reply conventions

bin/ai-toolbox.js             # CLI entry (npx target)
lib/                          # CLI implementation (init / sync / list)
scripts/build-manifest.js     # Regenerates manifest.json from frontmatter
manifest.json                 # Generated catalog of agents and skills
```

## Workflow overview

The Orchestrator is the master agent. It classifies the incoming request and routes work to specialists. Most flows end with the Reviewer (and Documenter when public-facing behavior changes).

| Request type | Flow |
|---|---|
| New feature (well-understood) | Planner → Developer → Reviewer → Documenter |
| New feature (novel / unknown stack) | Researcher → Planner → Developer → Reviewer → Documenter |
| Bug / crash / regression | Debugger → Developer (or Developer-Lite for a 1–2 line fix) → Reviewer → Documenter |
| Refactor | Planner → Developer → Reviewer |
| Tiny, single-file edit (typo, rename, constant, guard) | Developer-Lite → Reviewer |
| Open-ended technical question | Researcher (stop) |
| Pre-merge gate | Reviewer (+ `security-scan` skill if security-sensitive) |
| Address PR review comments | PR-Fixer → Reviewer (large fixes escalate to Developer mid-flow) |
| Docs-only update | Documenter → Reviewer |

The **Tester** agent is intentionally **not** in the routing matrix — it's manually invoked. Test work that belongs to a feature flow stays with Developer / Developer-Lite (regression tests, "the change comes with its test"). Invoke Tester directly when you want a dedicated test pass: building a suite for a legacy module, hardening flaky tests, expanding coverage on specific behaviors. Tester is the most expensive role in the toolbox (lots of file reads, lots of runner invocations), so the cost is gated behind explicit opt-in.

The full routing matrix and execution model live in `agents/Orchestrator.agent.md`.

## How agents and skills work together

- **Agents** are roles. Each file defines responsibilities, tools, workflow, output format, and explicit "do not do" rules. Only Developer, Developer-Lite, and Documenter modify files; the rest produce reports.
- **Cost tiering.** Developer and Developer-Lite share the same role but run on different models. The Orchestrator routes simple, single-file, low-risk edits to Developer-Lite (cheaper) and reserves Developer for multi-file, design, or security-sensitive work. See Orchestrator → "Developer vs. Developer-Lite" for the exact criteria.
- **Token discipline.** Every agent references `skills/token-discipline/SKILL.md` and has a "Cost Gates" section. Before any costly operation (web fetch, multi-file read, full test/build, repeated searches), an agent issues an `[OPERATOR CHECK]` and pauses — letting the human short-circuit work the agent would otherwise spend tokens on. Developer-Lite is strictest: instead of gating, it escalates to Developer.
- **Skills** are shared knowledge. Agents reference them by relative path (e.g. `../skills/code-quality/SKILL.md`). A skill is loaded only when the agent's task falls within its domain.

This split keeps each agent file focused on *how it operates* and lets multiple agents share the same standards without duplication.

## Conventions

Every agent file follows the same structure:

1. **YAML frontmatter** — `name`, `description`, `model`, `tools`.
2. **Role statement** — one paragraph: what this agent does and what it explicitly does NOT do.
3. **Skills** — list of skill files this agent reads when relevant, with the trigger.
4. **Workflow** — numbered steps from input to output.
5. **Output format** — a Markdown template the agent fills in.
6. **Rules** — non-negotiable constraints.
7. **What NOT to do** — common failure modes to avoid.

Every skill file follows:

1. **YAML frontmatter** — `name`, `description` (including when to invoke).
2. **First principle** — the one idea that organizes the rest.
3. **Concrete heuristics** — tables, checklists, examples.
4. **Anti-patterns** — what to avoid.

## Using a single agent directly

You don't have to enter through the Orchestrator. For a focused task, invoke a specialist directly:

- *"Run the Reviewer on this PR."*
- *"Use the Researcher to compare options for X."*
- *"Have the Debugger diagnose this stack trace."*
- *"Use the Tester to add coverage to `src/auth/session.ts`."* (Tester is **only** invoked this way.)

The Orchestrator is the right entry point when a request spans multiple specialists or when the right flow isn't obvious.

## License

See `LICENSE`.
