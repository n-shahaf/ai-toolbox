---
name: testing
description: Building and maintaining test suites — unit, integration, end-to-end. Covers the test pyramid, behavior-vs-implementation, determinism, mocking discipline, and anti-patterns. Reference when writing new tests, extending coverage, or hardening flaky suites. Used primarily by the Tester agent; referenced by Developer when shipping a regression test alongside a fix.
---

# Testing

A repeatable standard for tests that catch real defects and survive refactors. Used by the Tester agent; referenced by Developer (when shipping a regression test) and Reviewer (when judging coverage).

## First principle

**Test behavior, not implementation.** A test that fails when you rename a private function but keeps passing when the user-visible behavior breaks is the wrong test. Write tests against the contract the code makes with its callers — function signatures, HTTP responses, UI outputs, persisted state — not the steps it takes internally.

If a refactor that preserves behavior breaks your test, the test is coupled to the implementation. Fix the test, not the refactor.

## The test pyramid

| Level | Speed | Scope | What it asserts |
|---|---|---|---|
| **Unit** | ms | One function / class / module | A pure piece of logic produces the right output for the right inputs. |
| **Integration** | 10s–100s ms | A few modules wired together | The seams are correct: data flows through boundaries, mocks at the edges. |
| **End-to-end (e2e)** | seconds | Whole system, real or near-real deps | The user-visible flow works under realistic conditions. |

**Rule of thumb:** many unit tests, fewer integration tests, very few e2e tests. Inverting the pyramid (e2e-heavy) produces slow, flaky suites that nobody runs.

Pick the lowest level that can prove the behavior:
- Pure logic → unit.
- Logic that crosses a module boundary you care about → integration.
- "Does the whole product still work for a user?" → e2e (smoke level only).

## What to test

Cover the edge cases the code **claims** to handle:

- Empty inputs (`""`, `[]`, `{}`, `null`).
- Boundaries (zero, one, very large, negative, max int).
- Malformed inputs (wrong type, missing field, truncated).
- Concurrency and ordering (when the code is supposed to be safe under either).
- Error paths (what happens when the dependency throws, times out, returns 4xx/5xx).
- The bug, by name, for every fix that's already been made.

Don't test:
- The framework (`expect(Array.isArray([])).toBe(true)`).
- Trivial passthroughs and dataclasses.
- Implementation steps (which functions were called, in what order, with what internal arguments — unless ordering is the contract).

## Arrange / Act / Assert

Every test has three blocks, in order, with blank lines between:

```js
it("returns 401 when the token is expired", async () => {
  // Arrange
  const expired = makeToken({ exp: 0 });
  const req = makeRequest({ authorization: `Bearer ${expired}` });

  // Act
  const res = await handler(req);

  // Assert
  expect(res.status).toBe(401);
});
```

No logic in tests. No loops, no conditionals, no early returns. If a test needs branching to express what it's asserting, split it into two tests.

## Naming

Test titles describe the **behavior** in plain English:

- `it("returns 401 when the token is expired")` ✓
- `it("test1")` ✗
- `it("works")` ✗
- `it("handles edge case")` ✗

For regression tests, name the bug:

- `it("does not throw when settings opens with empty profile (#142)")` ✓

The title should let a future reader understand what broke, without reading the body.

## Determinism

A test must produce the same result every time on every machine. Sources of nondeterminism to eliminate:

- **Real time** — Stub `Date.now()` / `new Date()`; never sleep for "long enough."
- **Real network** — Mock the HTTP client at the boundary.
- **Real filesystem** — Use an in-memory fs, a tmpdir per test, or a fixture loader.
- **Real RNG** — Seed it, or inject a deterministic source.
- **Real timezone / locale** — Set both explicitly at the suite level.
- **Test ordering** — No test may depend on another test having run first.
- **Shared state** — Reset between tests (DB rows, in-memory stores, module-level vars).

If a test "passes most of the time," it is broken. Diagnose and fix; do not retry-until-green.

## Mocking discipline

**Mock at the boundary.** The line between your code and someone else's.

- ✓ Mock the network (the HTTP client your code calls).
- ✓ Mock the database driver (or use a real test database, also fine).
- ✓ Mock third-party SDKs.
- ✓ Mock the clock.
- ✗ Mock your own internal functions. If a function is hard to test without mocking its collaborators, the seam is in the wrong place — refactor the production code so the seam is at the boundary, not the middle.

**Verify the right thing.** A mock that asserts `expect(internalFn).toHaveBeenCalledWith(...)` is testing the implementation. A test that asserts the *external* observable effect (the HTTP response, the persisted row, the rendered output) is testing the behavior. Prefer the latter.

## One concept per test

Multiple `expect`s are fine when they describe the **same** behavior:

```js
it("returns the user with redacted email", () => {
  const user = service.get(42);
  expect(user.id).toBe(42);
  expect(user.email).toMatch(/\*\*\*/);  // same concept: redaction
});
```

Multiple `expect`s testing **different** behaviors should be separate tests:

```js
// Bad — two concepts crammed in
it("works", () => {
  expect(parseEmail("a@b.com")).toEqual({ local: "a", domain: "b.com" });
  expect(parseEmail("")).toBe(null);
});

// Good — one concept each
it("parses a valid email into local and domain", () => { ... });
it("returns null on empty input", () => { ... });
```

## Fixtures

- **Smallest fixture that exercises the case.** A 200-line JSON blob to test one field is too much.
- **Inline > factory > shared file.** Inline literal data is most readable; reach for a factory (`makeUser({ email })`) when many tests vary the same shape; reach for a shared fixture file only when the data is genuinely identical across tests.
- **No "god fixtures"** — one massive object that every test reuses, where it's unclear which fields matter for which test.
- **Generators / property-based testing** (fast-check, hypothesis) are excellent when the contract is "for all inputs of shape X, the output has property Y." Don't reach for them just to add tests.

## Snapshot tests

Use sparingly. Snapshots rot silently — they pass forever after they're recorded, then a "refresh snapshots" commit drowns real regressions.

- ✓ Acceptable for **small, stable** outputs: a CLI help string, a serialized config, an error message format.
- ✗ Avoid for **large or churny** outputs: full rendered DOM, large JSON payloads, anything that changes when unrelated code changes.

If you use a snapshot, the diff should be reviewable in a PR.

## Coverage

Coverage is a **side effect** of testing behavior, not the goal. 100% coverage of trivial passthroughs is worth less than 60% coverage of the hard branches. Don't write tests to chase a number.

What coverage does tell you: **lines never exercised** are suspicious. If a branch is hard to reach, ask why. Maybe it's dead code; maybe it's an edge case nobody covered.

## Anti-patterns

- **"Updated test to match new behavior"** — without checking whether the new behavior is correct. Tests are a contract; changing them on autopilot defeats the point.
- **Asserting on logs / stdout** when the real behavior is elsewhere. Logs are observability, not contracts.
- **Sleeping for "long enough."** Use a deterministic clock or wait on a real condition (`waitFor(() => element.exists)`).
- **Test interdependence.** Test B depends on Test A having seeded the DB. Order changes → suite breaks.
- **God mocks.** A mock that returns "whatever the test needs" by inspecting the call site. Use real fixtures or simple stubs.
- **Brittle selectors.** `document.querySelector(".css-1xj9k7p")` against a generated class name. Use accessible roles, test IDs, or text content.
- **Retrying flakes.** "It passes on the second try" means the test is wrong. Fix the test.
- **Asserting nothing.** A test with no `expect` (or only `expect(true).toBeTruthy()`) passes whether or not the code works.
- **One test per branch.** Implementation-coupled. Test the behaviors the branches produce, not the branches.
- **`expect(x).toHaveBeenCalled()` as the only assertion.** It proves a call happened, not that the system did the right thing.

## Flaky test investigation

When a test fails intermittently:

1. Run it in a loop locally (`for i in {1..50}; do ...; done`) until you have a reliable failure.
2. Capture which iteration fails and what differs from the passing iterations.
3. Hypothesize a source of nondeterminism (time, ordering, shared state, race).
4. Eliminate the source — don't paper over it with retries.
5. If you genuinely cannot reproduce, mark the test `.skip` with a comment linking to the investigation, and report it. Do not delete; do not retry.

A flake-fix without a root cause is the same anti-pattern as a try/catch around a real bug.

## Regression tests

Every shipped bug fix should ship with a test that:

1. **Fails on the un-fixed code** (verify this — write the test before the fix, or revert the fix and rerun).
2. **Passes on the fixed code.**
3. **Names the bug in the title** (issue number or short description).

If you can't write such a test, you haven't isolated the bug.

## Setup and teardown

- **Setup at the right scope.** Per-test setup for state that's mutated; per-suite setup for read-only fixtures.
- **Always teardown.** Open file handles, DB connections, timers, listeners, child processes. A test that leaks resources will silently slow the suite.
- **No `beforeAll` that creates rows your tests can mutate** — order dependency in disguise.

## When the test is hard to write

A test that's hard to write is feedback about the production code, not the test:

- "I need to mock 7 things" → too much coupling; the seams are wrong.
- "I need to read internal state to verify" → the function returns the wrong thing; expose what callers care about.
- "I need to set up the whole world" → push the side effects to the boundary, leave a pure core.
- "I need real time / real network" → inject a clock / HTTP client.

If you find yourself rewriting production code mid-test to make it testable, **stop**. That's a Developer decision, not a Tester decision. Report it instead.
