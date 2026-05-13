---
name: pr-comment-triage
description: Classifying and responding to pull-request review comments. Covers the comment taxonomy, the actionable-vs-defer rubric, reply conventions, and when to escalate. Used primarily by the PR-Fixer agent.
---

# PR Comment Triage

A repeatable method for going from "the PR has 14 review comments" to "every thread has a class, a reply, and (where applicable) a commit." Used by the PR-Fixer agent.

## First principle

**Triage before fixing.** A reviewer's comments are a portfolio of requests, not a checklist. Mixing fix-it-now with file-a-follow-up with disagree-with-rationale produces a chaotic PR. Classify the whole set first, then act in order.

## Comment taxonomy

Every review comment falls into exactly one of these classes. Apply them mechanically.

| Class | Meaning | Action | Resolve thread? |
|---|---|---|---|
| **BLOCKER** | Real correctness, security, data-loss, or contract issue. Must not ship without addressing. | Fix in this PR or escalate. | After fix lands. |
| **FIX** | Valid, in-scope suggestion. Reviewer is correct; the change is small. | Apply the fix in this PR. | After fix lands. |
| **DEFER** | Valid point but **out of this PR's scope.** | File a follow-up issue. Reply with the link. | No — reviewer decides. |
| **CLARIFY** | Comment is ambiguous; you can't tell what specifically is wrong or which behavior is expected. | Reply with one targeted question. | No — wait for the answer. |
| **PUSH-BACK** | You believe the comment is incorrect (based on code, not preference). | Reply with code-grounded rationale. | No — reviewer decides. |
| **DONE-ALREADY** | The comment is based on an older revision; current code already addresses it. | Reply pointing to the commit or `<file>:<line>` that addresses it. | Yes. |
| **DUPLICATE** | Same point as another comment you're already handling. | Reply with a link to the canonical thread. | Yes. |
| **NIT** | Stylistic preference, no real impact. | Fix if trivial; defer or push back if it would expand scope. | After fix lands (or per DEFER/PUSH-BACK). |
| **OPERATOR-DECISION** | In scope, but the right answer isn't yours (redesign request, contested architecture, conflicting reviewers). | Pause; surface to the operator before posting anything. | No — operator decides. |

## Triage rubric — when is a comment FIX vs DEFER vs PUSH-BACK?

Ask in this order:

1. **Is the reviewer factually right?** (Is the code actually broken, missing the case, doing the wrong thing?)
   - No → **PUSH-BACK**.
   - Yes → continue.
2. **Is the fix within this PR's stated scope?** (Does the PR description claim to do this?)
   - No → **DEFER** with a follow-up issue.
   - Yes → continue.
3. **Does the fix conflict with a deliberate design choice in this PR?**
   - Yes → reply explaining the choice; if the reviewer still disagrees, escalate to the operator.
   - No → continue.
4. **Does fixing it stay within the PR's scope?**
   - Yes (even if multi-file) → **FIX** — apply it. PR-Fixer is a self-contained flow; size of the fix doesn't matter as long as it's in scope.
   - No (asks for a redesign, restructure, or new requirement) → **OPERATOR-DECISION**. Surface to the operator; don't post and don't fix until they decide.
5. **Does the fix have correctness or security stakes?**
   - Yes → reclassify as **BLOCKER**.

## Reply conventions

Every comment gets a reply, even DEFER and PUSH-BACK. Silence is worse than disagreement.

### Reply length: one to three sentences, tops.

Reviewers want signal, not an essay. Concrete and short beats polite and long.

### Reply by class

**FIX / BLOCKER (fix applied):**
> Fixed in `<sha>`. Now `<one-line description of what changed>`.

**DEFER:**
> Good point, but out of scope for this PR (`<what this PR claims to do>`). Filed `<issue link>` to track.

**CLARIFY:**
> To make sure I fix the right thing — do you mean `<specific scenario A>` or `<specific scenario B>`?

**PUSH-BACK:**
> I think this is OK as-is: `<file>:<line>` (or `<function>`) already handles this because `<reason grounded in code>`. Happy to revisit if I'm missing the case you have in mind.

**DONE-ALREADY:**
> Already addressed in `<sha>` / at `<file>:<line>`.

**DUPLICATE:**
> Same as `<link to canonical thread>`; tracking the response there.

**NIT (fix applied):**
> Done in `<sha>`.

**NIT (defer / push back):**
> Leaving as-is to keep this PR scoped to `<purpose>` — happy to revisit in a follow-up.

**OPERATOR-DECISION:**
> *(No GitHub reply yet — the operator drafts the response after deciding.)*

### What replies must NOT do

- ✗ "Done." — no specifics. The reviewer can't verify without re-reading the diff.
- ✗ Apologies, hedging, or padding ("Sorry I missed this!", "Great catch!", "Will do!").
- ✗ Paragraphs of rationale. If the reply is more than three sentences, you're probably pushing back without grounding — get the rationale tight or escalate to the operator first.
- ✗ Promising future work without filing an issue. "Will do in a follow-up" with no link = vapor.
- ✗ Arguing taste. Subjective preferences belong in style guides, not PR threads.

## Resolving threads

- Resolve **after** the fix lands and you've verified it. Resolving before is a lie.
- Do NOT resolve threads you DEFER or PUSH-BACK on — let the reviewer decide whether your reply satisfies them.
- Do NOT resolve on a reviewer's behalf when they asked a question you haven't answered.

## Scope discipline

A pull request has a stated purpose (the description). The reviewer's role is to make that purpose ship correctly — not to slip in unrelated work. When a comment asks for something outside that purpose:

- **Small, related polish** (rename, comment, simplify): apply if it's two lines and obviously net-positive.
- **Refactor of nearby code:** defer with a follow-up issue.
- **New feature / new requirement:** defer with a follow-up issue.
- **"While you're here, can you also…":** defer.

Scope creep in a PR delays the PR and confuses the diff. Filing an issue is not a brush-off — it's the right tool.

## When to escalate to the operator

Pause and ask the operator (don't reply on GitHub yet) when:

- **Two reviewers disagree** about the same code. Reconcile offline, not in the thread.
- **A comment contradicts a decision the operator made.** The operator decides whether to revisit.
- **A PUSH-BACK rationale isn't airtight** — better to confirm the rationale before posting than to argue and be wrong.
- **The comment asks for a scope expansion you're not authorized to do** — operator decides defer vs. expand-this-PR.
- **The comment alleges a security issue** you can't immediately confirm or refute. Confirm with the operator before replying.
- **More than ~5 comments in the same area** point at a structural problem. The right move may be to redesign, which is not a PR-Fixer call.

## Why there's no "escalate to another agent" path

PR-Fixer is a **self-contained** flow. There is no chaining to Developer, Debugger, or any other agent. The operator points the agent at a PR; the agent reads, fixes, and replies; it reports back. That's the whole loop.

The reason: PR-comment work is qualitatively different from feature-development work. It's a bounded interaction with named reviewers about a specific diff. Routing parts of it to other agents fragments the conversation and produces partial responses that confuse reviewers.

When a comment exceeds what a comment-resolution pass can do (a redesign request, a contested architectural choice, a "this whole approach is wrong"), the right move is **OPERATOR-DECISION**: surface the situation, let the operator decide whether to restructure the PR, defer with an issue, push back, or close-and-redo. The operator may then start a separate flow (Researcher → Planner → Developer, say) — but PR-Fixer doesn't try to initiate that.

## Commit hygiene

- **One commit per logical fix** when practical. Easier to revert, easier to reference in replies.
- Commit messages name the area and the fix: `fix(auth): handle expired token in middleware`. Optionally add a trailer pointing to the review thread (`Addresses: <PR-comment-url>`).
- **Do not amend or squash** without the operator's say-so. They may want a clean history; they may want every commit visible to reviewers. Their call.
- **Do not force-push** without explicit operator authorization. Force-push is destructive to reviewers' in-flight context.

## Order of operations within a PR-Fixer pass

1. **Gather** — read PR description, diff, all open threads, CI status.
2. **Triage** — assign one class to every comment. Output the table.
3. **Confirm** — gate on PUSH-BACK and DEFER classifications. The operator should approve before you post disagreement or defer-with-issue.
4. **Fix** — apply each FIX / BLOCKER in order, smallest first. Commit per logical fix.
5. **Verify** — typecheck and targeted tests for what you touched.
6. **Reply and resolve** — one reply per thread; resolve only those you've actually fixed.
7. **Gate the push** — `[OPERATOR CHECK]` before pushing.
8. **Report** — final summary with triage table, fixes applied, escalations, and CI status.

## Anti-patterns

- **"Done." spam.** Every reply just says "Done." with no specifics. Useless to the reviewer.
- **Resolving before fixing.** Marking a thread resolved as a TODO list — except now the reviewer can't see the work-in-progress state.
- **Quiet scope expansion.** A reviewer asked one thing; you also "cleaned up" three nearby things. Diff is now harder to review and the original ask gets lost.
- **Skipping the triage step.** Diving straight into "easy" fixes, leaving the controversial ones for later — guarantees you'll re-read everything.
- **Arguing in the thread.** Three back-and-forth disagreements with the reviewer when one operator check would have ended it.
- **Resolving on behalf of the reviewer.** They asked a question; you replied; you resolved. They never said the reply satisfied them.
- **Filing an "issue" that's a sentence with no context.** A defer-issue should be reproducible by someone who wasn't in the PR thread.
- **Bulk replying with the same template.** Every comment is different; copy-paste replies signal you didn't read them.
- **Treating CI failures as review comments.** CI failures are bugs to fix, not opinions to triage — handle them, don't reply to them.

## When the PR is too far gone

Sometimes a PR has 30+ comments, conflicting reviewer asks, scope drift, and CI red across the board. Don't try to fix it all in one PR-Fixer pass:

- Report the state honestly.
- Recommend splitting the PR (operator decides).
- Recommend a redesign conversation if reviewers agree the approach is wrong.
- Do not silently push a 40-file commit "addressing all feedback."

Honest status > heroic mass-fix.
