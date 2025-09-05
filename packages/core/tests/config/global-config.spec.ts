import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { GlobalConfig } from "../../src/config/global-config";
import { Ruleset } from "../../src/rulesets/ruleset";
import { RulesetManager } from "../../src/rulesets/ruleset-manager";

describe("Global Rulesets Configuration", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "rulesets-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("Global Directory Detection", () => {
    it("should detect default global rulesets directory at ~/.rulesets", () => {
      const globalConfig = new GlobalConfig();
      const expectedPath = join(homedir(), ".rulesets");
      
      expect(globalConfig.getGlobalDirectory()).toBe(expectedPath);
    });

    it("should include XDG_CONFIG_HOME in search paths when set", () => {
      const originalXDG = process.env.XDG_CONFIG_HOME;
      process.env.XDG_CONFIG_HOME = testDir;
      
      const globalConfig = new GlobalConfig();
      const expectedPath = join(testDir, "rulesets");
      const paths = globalConfig.getSearchPaths();
      
      expect(paths).toContain(expectedPath);
      expect(paths[0]).toBe(join(homedir(), ".rulesets")); // Still prioritize default
      
      process.env.XDG_CONFIG_HOME = originalXDG;
    });

    it("should detect macOS Application Support directory as fallback", () => {
      const globalConfig = new GlobalConfig({ platform: "darwin" });
      const alternativePath = join(homedir(), "Library", "Application Support", "rulesets");
      
      const directories = globalConfig.getSearchPaths();
      expect(directories).toContain(alternativePath);
    });

    it("should prioritize directories in correct order", () => {
      const globalConfig = new GlobalConfig();
      const paths = globalConfig.getSearchPaths();
      
      expect(paths[0]).toBe(join(homedir(), ".rulesets"));
      expect(paths[1]).toMatch(/rulesets$/);
    });
  });

  describe("Config.toml Loading", () => {
    it("should load and parse config.toml from global directory", async () => {
      const configPath = join(testDir, "config.toml");
      const configContent = `
[rulesets]
version = "1.0.0"
default_destination = "agents-md"

[defaults]
auto_detect = true
auto_suggest = true
install_location = "project"
`;
      
      await Bun.write(configPath, configContent);
      const globalConfig = new GlobalConfig({ configPath });
      const config = await globalConfig.load();
      
      expect(config.rulesets.version).toBe("1.0.0");
      expect(config.rulesets.default_destination).toBe("agents-md");
      expect(config.defaults.auto_detect).toBe(true);
      expect(config.defaults.install_location).toBe("project");
    });

    it("should handle missing config.toml gracefully", async () => {
      const globalConfig = new GlobalConfig({ configPath: join(testDir, "nonexistent.toml") });
      const config = await globalConfig.load();
      
      expect(config).toBeDefined();
      expect(config.rulesets.version).toBe("1.0.0");
      expect(config.defaults.auto_detect).toBe(true);
    });

    it("should parse destination overrides", async () => {
      const configContent = `
[destinations]
claude_code_global = "~/.claude/CLAUDE.md"
claude_code_commands = "~/.claude/commands/"
cursor_rules = "~/.cursor/rules/"
`;
      
      await Bun.write(join(testDir, "config.toml"), configContent);
      const globalConfig = new GlobalConfig({ configPath: join(testDir, "config.toml") });
      const config = await globalConfig.load();
      
      expect(config.destinations.claude_code_global).toBe("~/.claude/CLAUDE.md");
      expect(config.destinations.claude_code_commands).toBe("~/.claude/commands/");
      expect(config.destinations.cursor_rules).toBe("~/.cursor/rules/");
    });

    it("should parse detection patterns", async () => {
      const configContent = `
[detection.patterns]
"package.json" = ["typescript", "node"]
"cargo.toml" = ["rust"]

[detection.dependencies]
"@types/react" = ["react"]
"vitest" = ["testing-vitest"]
`;
      
      await Bun.write(join(testDir, "config.toml"), configContent);
      const globalConfig = new GlobalConfig({ configPath: join(testDir, "config.toml") });
      const config = await globalConfig.load();
      
      expect(config.detection.patterns["package.json"]).toEqual(["typescript", "node"]);
      expect(config.detection.dependencies["@types/react"]).toEqual(["react"]);
    });
  });

  describe("Ruleset Metadata", () => {
    it("should load ruleset metadata from meta.toml", async () => {
      const metaPath = join(testDir, "sets", "typescript", "meta.toml");
      const metaContent = `
[set]
name = "TypeScript"
version = "1.0.0"
description = "TypeScript development rules"
author = "@galligan"
tags = ["typescript", "javascript"]

[extends]
sets = []

[requires]
sets = ["eslint", "prettier"]
optional = ["react"]
`;
      
      await Bun.write(metaPath, metaContent);
      const ruleset = new Ruleset(join(testDir, "sets", "typescript"));
      const metadata = await ruleset.loadMetadata();
      
      expect(metadata.set.name).toBe("TypeScript");
      expect(metadata.set.version).toBe("1.0.0");
      expect(metadata.requires.sets).toEqual(["eslint", "prettier"]);
      expect(metadata.requires.optional).toEqual(["react"]);
    });

    it("should detect ruleset files in directory", async () => {
      const setDir = join(testDir, "sets", "typescript");
      await Bun.write(join(setDir, "rules.md"), "# TypeScript Rules");
      await Bun.write(join(setDir, "meta.toml"), "[set]\nname = \"TypeScript\"");
      
      const ruleset = new Ruleset(setDir);
      const files = await ruleset.getFiles();
      
      expect(files).toContain("rules.md");
      expect(files).toContain("meta.toml");
    });

    it("should validate required metadata fields", async () => {
      const metaContent = `
[set]
description = "Missing name field"
`;
      
      await Bun.write(join(testDir, "meta.toml"), metaContent);
      const ruleset = new Ruleset(testDir);
      
      await expect(ruleset.validate()).rejects.toThrow("Missing required field: name");
    });
  });

  describe("Ruleset Composition", () => {
    it("should resolve extended rulesets", async () => {
      const baseMetaContent = `
[set]
name = "Base"
version = "1.0.0"
`;
      
      const extendedMetaContent = `
[set]
name = "Extended"
version = "1.0.0"

[extends]
sets = ["base"]
`;
      
      await Bun.write(join(testDir, "sets", "base", "meta.toml"), baseMetaContent);
      await Bun.write(join(testDir, "sets", "base", "rules.md"), "# Base Rules\n- Rule 1");
      await Bun.write(join(testDir, "sets", "extended", "meta.toml"), extendedMetaContent);
      await Bun.write(join(testDir, "sets", "extended", "rules.md"), "# Extended Rules\n- Rule 2");
      
      const manager = new RulesetManager({ globalDir: testDir });
      const composed = await manager.compose("extended");
      
      expect(composed.rules).toContain("Rule 1");
      expect(composed.rules).toContain("Rule 2");
    });

    it("should handle override configurations", async () => {
      const metaContent = `
[set]
name = "Bun"

[extends]
sets = ["typescript"]

[overrides]
"typescript.strict" = false
"node.version" = "latest"
`;
      
      await Bun.write(join(testDir, "meta.toml"), metaContent);
      const ruleset = new Ruleset(testDir);
      const overrides = await ruleset.getOverrides();
      
      expect(overrides["typescript.strict"]).toBe(false);
      expect(overrides["node.version"]).toBe("latest");
    });

    it("should merge multiple rulesets in correct order", async () => {
      const manager = new RulesetManager({ globalDir: testDir });
      
      await manager.createRuleset("base", { rules: "# Base\n- Base rule" });
      await manager.createRuleset("middle", { 
        rules: "# Middle\n- Middle rule",
        extends: ["base"]
      });
      await manager.createRuleset("top", {
        rules: "# Top\n- Top rule", 
        extends: ["middle"]
      });
      
      const composed = await manager.compose("top");
      const ruleOrder = composed.rules.match(/- \w+ rule/g);
      
      expect(ruleOrder).toEqual(["- Base rule", "- Middle rule", "- Top rule"]);
    });

    it("should detect circular dependencies", async () => {
      await Bun.write(join(testDir, "sets", "a", "meta.toml"), `
[set]
name = "A"
[extends]
sets = ["b"]
`);
      
      await Bun.write(join(testDir, "sets", "b", "meta.toml"), `
[set]
name = "B"
[extends]
sets = ["a"]
`);
      
      const manager = new RulesetManager({ globalDir: testDir });
      
      await expect(manager.compose("a")).rejects.toThrow("Circular dependency detected");
    });
  });
});