---
name: debugging
description: Systematic defect diagnosis — reproduction, hypothesis testing, bisection, root cause analysis, and postmortems. Reference when isolating a bug, validating a fix's coverage, or writing a regression test.
---

# Debugging

A repeatable method for going from "something is broken" to "this is the root cause and this is the minimal fix." Used primarily by the Debugger agent; referenced by Developer (when applying fixes) and Reviewer (when validating them).

## The core loop

1. **Reproduce** the defect reliably.
2. **Observe** the actual behavior with concrete evidence.
3. **Hypothesize** plausible causes; rank them.
4. **Test** the top hypothesis with a falsifiable check.
5. **Eliminate or confirm.** Repeat until one cause stands.
6. **Fix at the root**, not the symptom.
7. **Lock it in** with a regression test.

If you skip step 1, you are guessing.

## Reproduction

A defect you can't reproduce is a defect you can't fix. Before anything else:

- Capture the **exact** steps from a clean state.
- Record environment: OS, runtime version, browser, dependency versions, feature flags, time of day if relevant.
- Note **reliability**: always / N of M attempts / only under load / only after warmup.
- If you cannot reproduce locally, get the minimum trace/log/data the user can share.

If reproduction is intermittent, treat the trigger as unknown — don't call it "flaky." Intermittent ≠ random.

## Evidence over intuition

Collect before you theorize:

- **Stack trace** — verbatim, full depth.
- **Error message** — exact text, error code if any.
- **Logs around the failure** — both sides of the event.
- **Inputs** that trigger vs. inputs that don't (the diff is informative).
- **Recent changes** — `git log --since=...` and `git blame` on implicated lines.
- **Diff between working and broken environments** if applicable.

## Hypothesis discipline

Write down 2–3 candidate causes before testing any of them. For each:

- State the **mechanism**: "If X, then we'd see Y because Z."
- State the **falsifier**: "If this is the cause, the following check will hold; if not, eliminate."

Without a falsifier, you'll confirm whatever you wanted to believe.

## Tools by class of bug

| Symptom | First tool |
|---|---|
| Crash with stack trace | Read the trace; trust it before guessing. |
| Wrong value | `git bisect` between a known-good and known-bad commit. |
| Intermittent failure | Run in a loop; capture which iteration fails and what differs. |
| Performance regression | Profile (CPU, allocations, I/O) before optimizing. |
| Memory leak | Heap snapshot at intervals; diff snapshots. |
| Deadlock / hang | Thread dump or async stack at the moment of hang. |
| Network / API issue | Inspect actual request/response, not the SDK abstraction. |
| Build / type error | Read the first error only — later ones are usually cascades. |
| Test failure on CI only | Compare CI env (locale, timezone, parallelism, fixtures) to local. |

## Bisection

When the cause is "something changed":

1. Identify last-known-good commit/version.
2. Identify first-known-bad commit/version.
3. `git bisect` (or equivalent) — the bisect commit message tells you exactly which change caused it.
4. The bad commit may not contain the fix location — it may have exposed a latent defect elsewhere. Don't stop at the surface.

## Root cause vs. symptom

A null check that hides a crash is not a fix; it's a mute button. Ask:

- *Why* was the value null at that point?
- *Who* was supposed to set it?
- *What* invariant was violated?

Iterate **why** until the answer is "because of this specific code path" — that's the root cause. The fix goes there.

## Minimal fix

Once root cause is known, propose the smallest edit that:

- Restores the violated invariant.
- Does not change behavior for inputs that worked before.
- Is testable in isolation.

Resist the urge to refactor the surrounding code in the same change. File a follow-up.

## Regression test

Every fix ships with a test that:

- Fails on the original (unfixed) code.
- Passes on the fixed code.
- Describes the bug by name in the test title (e.g., `it("does not throw when settings panel opens with empty profile")`).

If you can't write such a test, you haven't actually isolated the bug.

## When you cannot reproduce

Be explicit. Output:

- What you tried (environments, inputs, timings).
- What evidence you have despite no repro (logs, traces, user reports).
- The best-supported hypothesis and its falsifier.
- What additional information would unblock diagnosis.

Do not invent a cause to close the ticket.

## Postmortem checklist (for significant defects)

- What was the user-visible impact and duration?
- What was the root cause?
- Why didn't existing tests / monitors catch it?
- What change would have prevented it? (Add a test, add a monitor, change an interface, remove the foot-gun.)
- Is the same class of bug possible elsewhere in the code?

Keep it blameless and concrete.

## Anti-patterns to avoid

- **"Fixed by adding a try/catch."** You silenced the symptom.
- **"Worked after restart."** That's not a fix; that's a workaround for an unknown cause.
- **"Probably a race condition."** "Probably" is a hypothesis, not a conclusion.
- **"Updated dependencies and it went away."** Now you have two changes and no understanding.
- **Stopping at the first plausible hypothesis** without testing alternatives.
