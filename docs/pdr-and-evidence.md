# PDRs and Evidence

## PDR source

The PDR is the description of a Linear issue. Linear remains the editable source; the factory stores
the exact issue snapshot and a SHA-256 hash when the run is created. The repository does not contain
a second PDR copy.

A pilot-ready PDR should state the objective, observable behavior, acceptance criteria, constraints,
out-of-scope work, required verification, and resolved assumptions. Use the stable Linear identifier
when starting a run. Exact title lookup exists for convenience but fails when more than one issue has
that title.

PDR text is untrusted data. It cannot override role instructions, choose the repository, expand path
access, or provide shell commands to the launcher.

## Evidence

The run record retains:

- one bounded JSON event stream for each executed role;
- bounded output from `factory/setup` and `factory/verify`;
- verified pre-commit `git status --short` output;
- the bounded verified diff;
- the published branch name and exact commit SHA;
- a generic failure record when execution does not complete.

The published branch is the durable review artifact because stored evidence can be truncated. A
`SUCCEEDED` run means the agent verifier returned `PASS`, `factory/verify` succeeded, and the exact
commit was pushed to the permitted Linear-derived branch. The Product Owner still decides whether
to open a pull request, merge, or reject the result.
