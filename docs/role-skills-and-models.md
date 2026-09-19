# Role Skills and Models

`factory.yaml` is the normative role assignment source. The PDR cannot select skills or models.

## Configuration

```yaml
execution:
  model: gpt-6-astra
  roleSkills:
    test-writer: [test-driven-development]
    backend-builder: [test-driven-development, debugging-and-error-recovery]
    ui-builder: [frontend-ui-engineering, design-taste-frontend, impeccable, awesome-design-md, browser-testing-with-devtools]
    observability-builder: [observability-and-instrumentation]
    verifier: [code-review-and-quality, doubt-driven-development]
  roleModels:
    feature-intake: gpt-6-astra
    backend-builder: gpt-6-astra
    ui-builder: gpt-6-astra
    observability-builder: gpt-6-astra
    verifier: gpt-6-astra
```

Every key must be a factory role ID. A role omitted from `roleModels` uses `execution.model`. A role
omitted from `roleSkills` receives no additional skill directory. Model IDs are opaque strings and
must be supported by the selected coding-tool adapter and account.

## Skill catalog and isolation

Each configured name resolves first to `.agents/skills/<name>` and then to the factory-specific
`factory-skills/<name>` catalog. It must contain a regular `SKILL.md`. The worker rejects missing
entries, unsafe names, duplicates, and symlinks escaping either catalog.
Only selected directories are mounted read-only into `/role/skills/<name>` in that role's container;
unassigned skills are absent. The prompt requires the role to read each assigned `SKILL.md` before
acting.

Skill files are trusted agent instructions. Review catalog changes like executable code. Never put
credentials in a skill, and do not let Linear issue content choose a skill name.

The UI builder additionally receives three locally hardened design skills:

- `design-taste-frontend` for marketing pages, portfolios, and explicitly authorized redesigns;
- `impeccable` as an instruction-only design and refinement vocabulary;
- `awesome-design-md` as a reference-only catalog loaded when trusted product context names a
  visual reference.

These profiles are pinned to audited upstream commits. They exclude upstream launchers, hooks,
runtime downloads, hosted APIs, image generation, package-on-demand commands, and paid services.
No other role receives them. Updating their upstream content requires a fresh security and cost
review; the catalog never updates them automatically.

## Browser automation

The UI roles use the factory-specific `playwright-browser-testing` skill. When browser automation is
enabled, they also receive the isolated runtime described in [Browser sidecars](browser-sidecars.md).
Assigning the skill while disabling the runtime does not make Playwright available.
