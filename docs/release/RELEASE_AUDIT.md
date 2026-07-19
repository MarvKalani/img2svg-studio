# Release audit

Audit date: 19 July 2026

## Automated evidence

Command:

```bash
npm --prefix web run test:e2e -- release-audit.spec.ts
```

Result: 3 scenarios passed in Google Chrome through Playwright.

| Area | Evidence |
| --- | --- |
| Keyboard | Image input, conversion settings, conversion, history A/B selection and SVG download complete without pointer input. |
| Accessibility | Axe 4.12.1 reports zero violations before and after the core workflow. |
| Invalid input | A damaged PNG and a file larger than 25 MiB show actionable errors while the last valid state remains usable. |
| Privacy | Local image loading and conversion make no cross-origin request. |
| Model network access | Only the explicit MODNet load action may request the exact revision-pinned model artifact and its redirect chain. |

The audit originally found invalid ARIA roles on model cards and the application status bar.
Both semantics were corrected before recording the passing result.

## Direct Chrome gate

The workflow passed in Chrome 150.0.7871.129 (arm64):

- keyboard-only conversion created two runs and assigned them to A and B with visible focus;
- damaged and larger-than-25-MiB inputs showed the expected errors without removing the runs;
- local loading and conversion reported only `http://127.0.0.1:4173` as a resource origin;
- explicit background removal completed locally with WebGPU; and
- the Chrome warning and error log was empty.

The model artifact was already cached in this normal browser session, so the direct network log
contained no model request. The automated cold-browser scenario separately verifies that an
uncached explicit model action permits only the revision-pinned artifact and its redirects.

## Clean-checkout gate

A detached worktree at commit `6ba7eae` passed `npm ci` with zero reported vulnerabilities,
followed by `npm run check`. This rebuilt the TypeScript application from an empty dependency
state and passed 72 Vitest scenarios plus all 23 Rust ground-truth and contract tests before
warning-free Clippy.

Its production preview ran on an isolated port and passed `test:demo` against that exact URL.
Direct Chrome 150 acceptance of the same preview produced four native shapes, two runs and one
A/B parameter difference with an empty warning and error log. The temporary server and worktree
were removed after the gate.

## Public-repository preflight

The tracked files and Git objects of both the Studio and predecessor repositories were checked
before publication. No common private-key, GitHub-token, OpenAI-key, AWS-key or assigned API-key
pattern was present; no local `/Users/marvin` path was tracked. Neither repository tracks `.env`,
`.wrangler`, `dist`, `target` or `node_modules` content, and both working trees are clean.
