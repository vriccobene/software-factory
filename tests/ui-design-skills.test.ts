import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const uiBuilderDefinitions = [
  ".claude/agents/ui-builder.md",
  ".codex/agents/ui-builder.toml",
  ".opencode/agents/ui-builder.md",
];

const hardenedUiSkills = [
  "design-taste-frontend",
  "impeccable",
  "awesome-design-md",
];

async function filesBelow(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

test("all interim UI builders receive the hardened design skills", async () => {
  for (const path of uiBuilderDefinitions) {
    const definition = await readFile(path, "utf8");
    for (const skill of hardenedUiSkills) {
      assert.match(definition, new RegExp(`\\b${skill}\\b`), `${path} must assign ${skill}`);
    }
  }
});

test("hardened design skills are not assigned to other interim roles", async () => {
  for (const directory of [".claude/agents", ".codex/agents", ".opencode/agents"]) {
    for (const entry of await readdir(directory)) {
      if (entry.startsWith("ui-builder.")) continue;
      const definition = await readFile(join(directory, entry), "utf8");
      for (const skill of hardenedUiSkills) {
        assert.doesNotMatch(definition, new RegExp(`\\b${skill}\\b`), `${directory}/${entry} must not assign ${skill}`);
      }
    }
  }
});

test("the isolated factory assigns hardened design skills only to ui-builder", async () => {
  const config = await readFile("factory.example.yaml", "utf8");
  const uiBuilderLine = config.match(/^\s+ui-builder:\s*\[([^\]]+)]/m)?.[1] ?? "";

  for (const skill of hardenedUiSkills) {
    assert.match(uiBuilderLine, new RegExp(`\\b${skill}\\b`), `factory.example.yaml must assign ${skill} to ui-builder`);
    const withoutUiBuilder = config.replace(/^\s+ui-builder:\s*\[[^\]]+]\s*$/m, "");
    assert.doesNotMatch(withoutUiBuilder, new RegExp(`\\b${skill}\\b`), `${skill} must not be assigned to another isolated role`);
  }
});

test("hardened design skill payloads contain no executable or audited paid-service hooks", async () => {
  for (const skill of hardenedUiSkills) {
    const root = join(".agents/skills", skill);
    const files = await filesBelow(root);
    assert.ok(files.includes(join(root, "SKILL.md")), `${skill} must contain SKILL.md`);

    for (const path of files) {
      const metadata = await stat(path);
      assert.equal(metadata.mode & 0o111, 0, `${path} must not be executable`);
      const content = await readFile(path, "utf8");
      assert.doesNotMatch(content, /\b(?:npx|local-linter)\s+[@A-Za-z]/i, `${path} must not direct package-on-demand execution`);
      assert.doesNotMatch(content, /curl\s+-[^\n|]*\|\s*(?:ba)?sh/i, `${path} must not contain download-and-execute pipelines`);
      assert.doesNotMatch(content, /api\.openai\.com|OPENAI_API_KEY|impeccable\.style\/api/i, `${path} must not invoke audited paid or hosted APIs`);
      assert.doesNotMatch(content, /scripts\/impeccable|generate-image/i, `${path} must not invoke the removed Impeccable runtime`);
    }
  }
});
