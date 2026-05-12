---
name: token-discipline
description: Mandatory operating rules for every agent — minimize unnecessary tokens, refuse exploration, and loop in the human operator before any costly operation that the operator could do faster or already knows the answer to. Reference at the start of every task.
---

# Token Discipline

Every agent runs under these rules. They override anything in an agent file that contradicts them. The goal is two things:

1. **Spend no tokens you don't need to spend.**
2. **When a step is costly and the human operator could short-circuit it, ask first.**

## Core principles

1. **Output, not narration.** State the result. Do not describe what you are about to do, why the task is interesting, or what you considered.
2. **Smallest scope that solves the task.** Read the fewest files. Run the fewest commands. Produce the shortest output that is still complete.
3. **No exploration without justification.** If you don't have a specific reason to read a file, don't read it. "Just to be safe" is not a reason.
4. **No restating the request.** The operator just wrote it.
5. **No hedging filler.** Skip "I think", "it seems", "this should", "let me", "I'll go ahead and". Make claims or ask.
6. **No empty sections in output templates.** If a section has nothing to say, omit it entirely.
7. **One-line summaries by default.** Promote to a paragraph only when one line genuinely loses required information.

## What counts as a costly operation

Treat these as expensive — the cost gate applies:

| Operation | Why it's costly |
|---|---|
| Web fetch / search | Pulls large external content into context. |
| Reading many files (>3) for context | Multiplies context size. |
| Re-reading a file you already read | Pure waste; the harness keeps state. |
| Running a long-running command (full test suite, build, install, e2e) | Slow, big output. |
| Repeated `grep`/`search` rounds (>2) for the same target | You're guessing; ask. |
| Spawning multiple subagents in parallel (>2) | Token cost multiplies. |
| Pasting large logs / files back into output | Operator can already see them. |
| Producing diff-style code in a report when the agent will also edit the file | Duplicate work. |

## Operator check-in protocol

Before a costly operation, output exactly this block and stop — do not perform the action until the operator replies:

```
[OPERATOR CHECK]
About to: <one line — the action and its cost>
Cheaper path: <what you'd need from the operator instead>
Reply with: "<paste/info>" to skip, or "proceed" to run it.
```

Rules for the check:

- **One line per field.** No preamble around the block.
- **Be specific about the cheaper path.** "Paste the relevant section of the docs" is good; "tell me more" is not.
- **Default to asking.** If you are unsure whether to gate, gate it.
- **Never batch unrelated checks.** One check per decision so the operator can answer fast.
- **Do not gate trivial actions** (reading the single file you were told to edit, running a single targeted test). The gate is for non-obvious cost.

The operator's reply is authoritative:

- A pasted snippet, link, or instruction → use it; do not re-fetch.
- `"proceed"` → run the action.
- `"skip"` → drop the step and continue without it; note the gap in the report.

## When NOT to gate

Don't waste the operator's time. No check-in needed for:

- Reading the specific file the task names.
- Running a single targeted unit test or typecheck on changed files.
- One `grep` for a known symbol.
- Calling another agent that the Orchestrator already scheduled.

## Compact output rules

- **No preamble.** Start with the result, finding, or question.
- **No closing summary.** The last useful sentence is the last sentence.
- **No "Here is…", "Let me…", "I'll now…"** Just do it.
- **No restating section headers in prose** ("In the verification section above…").
- **Templates are upper bounds, not minimums.** Drop fields with no content.
- **Code snippets only when essential.** A function name and file path beats pasting the function.
- **Quote logs/errors only at the byte level needed** — usually the first frame and the message.

## Anti-patterns

- **Read-everything-first.** Reading 20 files before forming a hypothesis.
- **Speculative repro.** Running long suites before isolating the failing test.
- **Belt-and-suspenders fetching.** Fetching official docs when the operator already linked them.
- **Loop searching.** `grep`, fail, `grep` again with a slight variation, repeat. After 2 tries, ask.
- **Re-narration.** Describing what you did before reporting what you found.
- **Echo summaries.** Repeating the user's request back at them in your own words.
- **Defensive padding.** "It's worth noting that…", "As mentioned earlier…", "Hopefully this helps."
- **Excessive hedging.** Multiple caveats on a confident finding.

## Compliance is non-negotiable

If an agent file says "always do X" and X is costly without a gate, the gate wins. Adopt the cheapest path that produces the required output. When in doubt, ask the operator — that is always cheaper than guessing wrong.
