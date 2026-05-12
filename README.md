# ai-toolbox

A reusable set of agents and skills for an LLM-driven dev workflow. Designed for GitHub Copilot, but the agent and skill files are plain Markdown with YAML frontmatter and can be loaded by any tool that understands that format.

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
  Documenter.agent.md         # Updates README, CHANGELOG, docstrings to match code

skills/                       # Reusable knowledge agents reference by path
  token-discipline/SKILL.md   # Mandatory for every agent: token budget rules + operator check-in protocol
  code-quality/SKILL.md       # SOLID, patterns, code smells, review heuristics
  debugging/SKILL.md          # Reproduction, hypothesis testing, root-cause analysis
  documentation/SKILL.md      # Voice, structure, what belongs where
  security-scan/SKILL.md      # Repository-wide security scan (medium/high/critical only)
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
| Docs-only update | Documenter → Reviewer |

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

The Orchestrator is the right entry point when a request spans multiple specialists or when the right flow isn't obvious.

## License

See `LICENSE`.
