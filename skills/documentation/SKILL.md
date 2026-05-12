---
name: documentation
description: Writing and updating project documentation — README, CHANGELOG, docstrings, API reference. Covers voice, structure, what belongs where, and when to write nothing. Used primarily by the Documenter agent.
---

# Documentation

A standard for keeping project documentation accurate, minimal, and discoverable. The Documenter agent applies this skill; the Developer and Reviewer reference it when touching public-facing surfaces.

## First principle

Documentation exists to answer questions a reader will actually have. If no reader will ask the question, don't write the answer.

The code is the source of truth. Documentation is a **summary and orientation layer**, not a parallel implementation. When they disagree, the code wins and the docs are wrong.

## Where things belong

| Content | Home |
|---|---|
| What the project is, who it's for, how to start | README |
| User-visible changes per release | CHANGELOG |
| Public API contract, parameters, errors, examples | Docstring on the export |
| Internal invariants and non-obvious assumptions | Inline comment at the relevant line |
| Architecture, design decisions, trade-offs | `docs/` or ADRs |
| Tutorials, end-to-end walkthroughs | `docs/guides/` |
| Generated reference (typedoc, OpenAPI, etc.) | Generated; do not hand-edit |

When the same fact lives in two places, pick one and link from the other.

## README structure

A useful README answers four questions in this order:

1. **What is this?** One paragraph. Domain, not feature list.
2. **How do I run it?** Install, configure, start. Copy-pasteable commands.
3. **How do I use it?** A minimal working example.
4. **Where do I learn more?** Links into `docs/`, the API reference, or external pages.

Optional sections (add only when relevant): requirements, configuration table, contributing, license. Skip sections that would be empty or rote.

## CHANGELOG entries

Follow the project's existing format. If none exists, prefer **Keep a Changelog** sections:

- **Added** — new features.
- **Changed** — changes to existing behavior.
- **Deprecated** — features marked for removal.
- **Removed** — features taken out.
- **Fixed** — bug fixes.
- **Security** — vulnerability fixes.

One bullet per user-visible change. Reference the PR or issue number. Past tense, plain language:

> - Added `--retry` flag to `cli upload` for transient network errors. (#142)
> - Fixed crash when opening Settings with an empty profile. (#147)

Don't log internal refactors, dependency bumps without user impact, or test-only changes.

## Docstrings (public API)

Cover, in this order:

1. **What it does** in one line.
2. **Parameters**, with type and meaning (skip if obvious from the signature).
3. **Return value** and shape.
4. **Errors** thrown / status codes returned.
5. **Example**, if usage isn't obvious from the signature.
6. **Notes** on side effects, performance, or concurrency only when surprising.

Skip docstrings on internal helpers whose name and signature already explain themselves.

## Inline comments

Write one only when:

- The reason behind the code is non-obvious.
- A subtle invariant or assumption would break if violated.
- A workaround references an external issue (link it).

Do not write inline comments that:

- Restate the next line of code.
- Reference the current task or PR.
- Name the callers (rots as code evolves).

## Voice

- **Plain, declarative, present tense.** "The parser rejects empty input." Not "The parser will reject..." or "This will reject...".
- **Imperative for instructions.** "Run `npm install`." Not "You should run...".
- **No marketing.** Avoid "powerful," "seamlessly," "robust," "blazing fast."
- **No filler.** "In order to" → "to". "It is important to note that" → delete.
- **Concrete examples beat adjectives.**

## When to write nothing

- The change is internal-only with no user-visible surface.
- The behavior is already covered by an unchanged docstring or example.
- A new section would duplicate existing content rather than link to it.
- A regression test already documents the previously-broken behavior.

Adding empty or speculative docs is worse than leaving the gap visible.

## Examples

Examples are runnable specifications. Each example must:

- Compile and run against the documented version.
- Show **one** thing — not a kitchen sink.
- Use realistic but minimal values; no `foo`/`bar`/`baz` if the domain has natural names.
- Be re-verified when the documented surface changes.

If you can't run the example, label it illustrative or remove it.

## Reviewing docs

A docs change passes review when:

- Every claim is true against the current code.
- Every command and example runs as written.
- Every link resolves.
- Voice and structure match surrounding content.
- Nothing was deleted that's still accurate.

## Common failure modes

- **Drift.** Code changed; docs didn't. Fix by sweeping public surfaces after every feature/fix.
- **Duplication.** Same fact in README, docstring, and changelog. Pick one home and link.
- **Aspiration.** Documenting what you wish the code did. Document what it actually does.
- **Over-documentation.** Adding paragraphs around obvious code. The reader's time is the scarce resource.
- **Stale examples.** The most damaging kind of error — readers trust examples.
