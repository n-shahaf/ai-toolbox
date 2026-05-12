---
name: security-scan
description: Perform a repository-wide security scan (codebase scan, not PR diff) and report only medium/high/critical vulnerabilities with concrete exploit paths and code evidence. Use when the user asks for a security review, security audit, threat review, SAST-style scan, or types the /security-scan command.
---

# Security scan (codebase)

## Trigger

Run this workflow when the user requests a **security scan** of a repository, or types **`/security-scan`**.

## Goal and scope

- Scan the **entire codebase** (or the user-specified directories) for **real, exploitable** vulnerabilities.
- Prefer issues that are **reachable** from attacker-controlled inputs and cross a **trust boundary** (internet user → server, untrusted file → parser, user content → browser, internal service → privileged network, etc.).
- Do **not** focus on style, theoretical issues, or “best practices” unless they create a plausible exploit.
- Report **only Medium / High / Critical** findings.

## Operating rules

1. **Prove the dataflow**: trace attacker-controlled input → transforms → sink.
2. **Check existing controls** before calling it a vuln:
   - authn/authz & permission boundaries
   - schema validation, runtime validation, type constraints
   - framework escaping, templating rules
   - ORM parameterization / query builders
   - allowlists and bounded constants
   - CSRF protections, same-site cookies, CORS, SSRF egress controls
3. **Prefer reachable code paths**: prioritize routes/controllers/handlers, background jobs processing untrusted data, webhooks, file uploads, auth flows, admin consoles, and integrations.
4. **Be precise**: include the exact file/function and the relevant snippet(s) that make exploitation plausible.
5. **No secret guessing**: only flag secrets/keys if there is clear evidence (hardcoded token, committed private key, etc.).

## Scan workflow

### 1) Map the attack surface

Identify how untrusted input enters the system:
- HTTP endpoints (REST/GraphQL), RPC, webhooks
- file upload and import paths
- auth/session handling, password reset, magic links, OAuth callbacks
- background jobs consuming queues/events
- admin or internal-only endpoints (verify they are truly protected)
- templating / SSR / email rendering

### 2) Build a shortlist of suspicious patterns

Hunt for sinks and dangerous primitives:
- Injection: SQL/NoSQL, command execution, template injection, LDAP, XPath, log injection
- SSRF: server-side HTTP clients, URL fetchers, metadata access, redirect-following
- XSS: rendering user content, dangerouslySetInnerHTML, markdown/html rendering, DOM sinks
- Authn/Authz: IDOR, missing object-level checks, role confusion, tenant boundary breaks
- Request forgery: CSRF, webhook signature verification, callback URL validation
- Path traversal / file disclosure: fs reads/writes, zip extraction, temp files, path joins
- Deserialization / parsing: YAML/JSON schema-less parsing, pickle, eval-like APIs
- Crypto misuse: JWT verification, algorithm confusion, weak randomness, insecure hashing
- Secrets leakage: logs, error pages, debug endpoints, env dumps
- Supply chain: risky new dependencies, postinstall scripts, direct Git deps, vendored binaries

### 3) Trace and validate exploitation

For each candidate:
- Identify **attacker-controlled input** (request params/headers/body, webhook payload, uploaded file, query string, URL parameter, message queue payload).
- Trace to the **sink** (DB query, file system, command exec, HTML render, HTTP request, deserializer).
- Determine exploitability given controls (validation, escaping, parameterization, authz).
- Assign severity:
  - **Critical**: RCE, auth bypass to admin, cross-tenant compromise, credential theft at scale
  - **High**: SSRF to sensitive networks, stored XSS in privileged context, IDOR across tenants
  - **Medium**: reflected XSS with constraints, limited SSRF, sensitive info leak with impact

### 4) Report with evidence and concrete fixes

Provide minimal, actionable remediation:
- add/repair authz checks (object-level, tenant-scoped)
- add runtime validation (schema) at trust boundary
- use parameterized queries / safe APIs
- add allowlists (hosts, paths, redirects), disable redirect following where needed
- escape/sanitize output at render boundaries
- add webhook signature verification / replay protection
- harden file handling (normalize paths, reject `..`, safe extraction)
- add egress restrictions / metadata IP blocks for SSRF

## Output format (use this template)

```markdown
## Security scan report

### Executive summary
- Overall risk: [Low/Medium/High/Critical]
- Findings: [# Critical] / [# High] / [# Medium]

### Findings
#### [Severity] Finding title
- **Impact**: What an attacker can achieve.
- **Attack path**: Step-by-step exploit narrative.
- **Evidence**: File(s)/function(s) and the exact code that enables it.
- **Why existing controls don’t stop it**: (or “Controls present” if you downgrade/close).
- **Fix**: Concrete changes (preferred APIs/patterns). Include guardrails (allowlists, validation).
- **Verification**: How to test the fix (request example or unit/integration test idea).

### Non-findings (optional)
List notable areas reviewed that appear protected (authz checks present, parameterized queries, etc.).
```

## Quality bar (what to skip)

Skip:
- Low severity issues, purely theoretical findings, “might be vulnerable” with no path to sink
- Refactors, style, lint, or performance issues unrelated to security
- “Dependency is old” warnings without a realistic exploit path in this app’s usage

