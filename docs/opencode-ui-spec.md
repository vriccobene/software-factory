# OpenCode Factory UI specification

Status: Product Owner intent confirmed on 2026-09-29. This document defines the local UI capability; the existing containerized factory API and Linear workflow remain separate.

## Outcome and scope

One Product Owner can configure local product checkouts, supply an approved PDR, start the interim `/factory-run` command through OpenCode, answer blocking questions, inspect progress and evidence, and return to past runs. The app binds to loopback only. It never commits, pushes, opens a PR, deploys, or modifies Linear.

## Capabilities and acceptance criteria

| ID | Capability | Acceptance |
|---|---|---|
| UI-01 | Project registration | Choose a local checkout directory by path or folder browser; validate Git checkout and lifecycle hooks; retain the trusted directory locally. The UI explains missing setup instead of running arbitrary commands from a PDR. |
| UI-02 | PDR input | Accept Markdown text, browser file selection or drag and drop, and a path to a local PDR file. Show the exact immutable snapshot to be sent to OpenCode. Require a stable identifier and explicit approved-PDR confirmation. |
| UI-03 | Start and concurrency | Start one run at a time by default. A local setting may explicitly raise the active-run limit; separate run workspaces are required before concurrent editing is enabled. Never start two runs in one checkout. |
| UI-04 | Live run | Show the current phase, OpenCode session and child agents when reported, chronological messages/tool events, elapsed time, token counts when reported, and connection or execution errors. Mark unavailable values honestly. |
| UI-05 | Interaction | Surface pending OpenCode questions and permissions. Answers must address the exact question request; permission controls offer allow once or reject. Neither action creates a new run or grants lasting permission. No unsolicited mid-run messages are needed. |
| UI-06 | Stop | An explicit stop action aborts the OpenCode session. Preserve run history and workspace. Stop and resume are distinct operations; automatic resumption is not required. |
| UI-07 | Review | Show verifier outcome, `factory/verify` outcome, final summary and changed-file diff. Do not label a run successful unless both required verification gates are evidenced. |
| UI-08 | History and notifications | Persist run metadata, PDR snapshot and bounded evidence locally. Reopen old runs after browser or app restart. Notify the desktop for a blocking question and terminal outcome when browser permission is granted. |

The timeline contains externally observable actions and any reasoning text that OpenCode actually exposes. Full private chain of thought is not a requirement. Token totals are reported values, never invented estimates.

## Integration boundary

The local app talks only to an operator-configured loopback OpenCode server. It should use its session, command, message, child-session, diff, event and abort interfaces. OpenCode API compatibility must be checked against the running server's `/doc` contract before enabling controls; fields and pending-question APIs vary by version. OpenCode credentials stay in the OpenCode process and must not be copied into the UI store. PDR content is untrusted requirements data and cannot select command names, shell commands, permissions, or repository paths.

The interim workflow requires the project-scoped `.opencode` configuration from this repository and a trusted checkout path. Existing uncommitted work must be preserved. Each run needs a dedicated working tree or equivalent isolation before parallel runs can write. The coordinator still follows `docs/opencode-interim.md` and `.agents/skills/factory-run/SKILL.md` and leaves publication to the Product Owner.

## First implementation slice

Build a real local app shell with project registration, PDR input, run creation, durable history, live OpenCode transcript, token/time display, stop, question response, and review surfaces. Gate controls that the connected OpenCode version does not support. Keep the interface useful when OpenCode is offline by showing stored history and a clear connection state. Parallel runs use a separate detached Git worktree for every PDR and remain opt-in through a local limit of 1–4. The operator must review each workspace before publication.

## Technical conventions

- Source: `src/opencode-ui/server.mjs`; static assets: `src/opencode-ui/public/`; tests: `tests/opencode-ui*.test.mjs`.
- Runtime: Node 22, browser native HTML/CSS/JavaScript. The local UI is a separate Node entry point and has no new dependencies.
- Development: `npm run ui:dev`; syntax checks: `node --check src/opencode-ui/server.mjs` and `node --check src/opencode-ui/public/app.js`; UI integration test: `npm run test:ui`; existing project build: `npm run build`.
- Use named functions and typed boundary validators. For example, `if (!isRunId(value)) throw new Error("Invalid run ID");`.
- Test input validation, persistence, API mapping and run state changes. Manually verify browser behavior against a running OpenCode server before claiming full integration.
- Bind to `127.0.0.1`; validate HTTP Origin for mutations; cap request and stored transcript sizes; escape all displayed external text.

## Open questions for integration testing

- The local `opencode` executable is not installed in this environment. Confirm the installed OpenCode version and its live `/doc` schema on the target PC before acceptance of the connector. The browser and a simulated OpenCode server were tested; real agent interaction remains unverified.
- OpenCode versions expose pending questions and permission requests differently. Verify the exact request/reply shape with the target version before declaring UI-05 complete.
- The app creates detached Git worktrees from the registered checkout HEAD. A real OpenCode pilot is still required to establish that the local server respects the supplied target path and command workflow.

Official API references checked 2026-09-29: [OpenCode server](https://opencode.ai/docs/server/), [question routes](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/instance/httpapi/groups/question.ts), [permission routes](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/instance/httpapi/groups/permission.ts), [question schema](https://github.com/anomalyco/opencode/blob/dev/packages/schema/src/v1/question.ts).
