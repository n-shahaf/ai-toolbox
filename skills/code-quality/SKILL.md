---
name: code-quality
description: Writing and reviewing clean, maintainable code. Covers SOLID, design patterns, code smells, and review heuristics. Reference when designing modules, implementing features, or reviewing diffs.
---

# Code Quality

A shared standard for clean, maintainable code used by the Developer, Reviewer, Planner, and Researcher agents.

## Core principles

1. **Clarity over cleverness.** Code is read more often than it is written.
2. **Explicit over implicit.** No hidden control flow, magic globals, or implicit conversions.
3. **Local reasoning.** A function's behavior should be understandable from its body and signature.
4. **Smallest change that works.** Don't refactor on top of a bug fix; don't extract on the first occurrence.
5. **Match the codebase.** Existing conventions outrank personal preference.

## SOLID, briefly

- **S**ingle responsibility — A module/function has one reason to change.
- **O**pen/closed — Extend via composition or new modules; avoid editing battle-tested code to add unrelated behavior.
- **L**iskov — Subtypes honor the contracts of their base.
- **I**nterface segregation — Many small interfaces beat one large one.
- **D**ependency inversion — Depend on abstractions at module boundaries; concrete dependencies are fine inside a module.

Apply these as heuristics, not laws. A 20-line script does not need DI.

## Useful patterns (and when to use them)

| Pattern | Use when |
|---|---|
| **Strategy** | Multiple interchangeable algorithms selected at runtime. |
| **Factory** | Construction is non-trivial or varies by config. |
| **Repository** | Decouple business logic from a storage mechanism. |
| **Observer / pub-sub** | One change has many independent reactions. |
| **Adapter** | Bridging incompatible interfaces from external systems. |
| **Builder** | Constructing objects with many optional fields. |

Anti-pattern: reaching for a pattern before you have two real call sites. The first occurrence is a function; the second is a duplication; the third is a pattern.

## Code smells to flag

- **Long function** — >50 lines or nested >3 levels. Extract or flatten.
- **Long parameter list** — >4 positional params. Use an options object or split the function.
- **Feature envy** — A function manipulates another module's data more than its own. Move it.
- **Shotgun surgery** — One change requires edits across many files. Cohesion is wrong.
- **Primitive obsession** — Domain concepts represented as raw strings/ints with implicit rules.
- **Speculative generality** — Hooks, configs, or abstractions added for hypothetical futures.
- **Dead code** — Unused exports, commented-out blocks. Delete; git remembers.
- **Magic numbers/strings** — Name them as constants when the value carries meaning.
- **Mutable shared state** — Globals or singletons that two call sites can mutate. Pass explicitly.

## Naming

- **Descriptive but simple.** `userId` not `u`, but also not `currentlyLoggedInUserIdentifier`.
- **Verb-first for actions:** `parseConfig`, `sendEmail`, `validatePayload`.
- **Noun for data/types:** `User`, `OrderTotal`, `RetryPolicy`.
- **Consistent prefixes** for booleans (`is`, `has`, `should`) and lists (plural nouns).
- **No type prefixes** (`IUser`, `strName`) — the language has types.

## Comments

Write a comment only when:
- The **why** is non-obvious and the code can't express it.
- A subtle invariant or assumption would break if violated.
- A workaround references an external bug, with a link.

Do not write comments that:
- Restate the code in English.
- Describe the current task ("added for ticket X").
- Reference current callers ("used by Y").

## Error handling

- **Fail at the boundary.** Validate user/API input at the edge; trust internals.
- **Be explicit.** Never swallow an exception silently. If you catch it, log it or transform it.
- **Distinguish kinds.** Programmer errors (bugs) crash loudly; operational errors (timeouts) get retries or graceful degradation.
- **Don't use exceptions for control flow.**

## Testing

- **Test observable behavior**, not implementation. Refactoring should not require rewriting tests.
- **One assertion per concept.** Multiple `expect` calls are fine if they describe the same behavior.
- **Arrange / act / assert** structure; no logic in tests.
- **Deterministic.** No reliance on real time, real network, random ordering, or filesystem layout.
- **Cover edge cases the code claims to handle**: empty, null, very large, concurrent, malformed.

## Review heuristics (use with Reviewer agent)

When reading a diff, ask in order:
1. Does it do what it claims?
2. Are edge cases handled?
3. Are errors handled at the right layer?
4. Is the design consistent with the rest of the module?
5. Would I be able to delete this and rewrite it in a day if I had to?

If the answer to #5 is no, the change is probably too tangled.

## When to refactor

Refactor when:
- The next change you need to make is hard because of current structure.
- A new abstraction has earned its keep across 3+ call sites.
- A pattern in the file is now used inconsistently.

Do not refactor when:
- You're in the middle of a bug fix or feature.
- The motivation is "I would have done this differently."
- The change has no measurable benefit (clarity, performance, fewer bugs).
