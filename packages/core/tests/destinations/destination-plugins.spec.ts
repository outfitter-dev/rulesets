import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BasePlugin } from "../../src/destinations/base-plugin";
import { ClaudeCodePlugin } from "../../src/destinations/claude-code-plugin";
import { CursorPlugin } from "../../src/destinations/cursor-plugin";
import { WindsurfPlugin } from "../../src/destinations/windsurf-plugin";
import { CopilotPlugin } from "../../src/destinations/copilot-plugin";
import { AgentsMdPlugin } from "../../src/destinations/agents-md-plugin";
import type { ComposedRuleset } from "../../src/rulesets/ruleset-manager";

describe("Destination Plugins", () => {
  let testDir: string;
  let mockRuleset: ComposedRuleset;
  
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "dest-test-"));
    process.chdir(testDir);
    
    mockRuleset = {
      name: "typescript",
      rules: "# TypeScript Rules\n\nUse strict types.",
      metadata: {
        set: {
          name: "typescript",
          version: "1.0.0",
          description: "TypeScript rules",
          author: "@test",
          tags: ["typescript"]
        }
      }
    };
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  describe("BasePlugin", () => {
    class TestPlugin extends BasePlugin {
      id = "test";
      name = "Test Plugin";
      description = "Test destination";
      
      getPaths(scope: 'global' | 'project'): string[] {
        return scope === 'project' ? [".test/rules.md"] : [];
      }
      
      formatContent(content: string): string {
        return `<!-- TEST -->\n${content}`;
      }
    }
    
    it("should provide base functionality", async () => {
      const plugin = new TestPlugin();
      
      expect(plugin.id).toBe("test");
      expect(plugin.name).toBe("Test Plugin");
      expect(plugin.getPaths('project')).toEqual([".test/rules.md"]);
    });
    
    it("should generate formatted content from rulesets", async () => {
      const plugin = new TestPlugin();
      const content = await plugin.generate([mockRuleset]);
      
      expect(content).toContain("<!-- TEST -->");
      expect(content).toContain("TypeScript Rules");
      expect(content).toContain("Use strict types");
    });
    
    it("should write to filesystem", async () => {
      const plugin = new TestPlugin();
      const content = await plugin.generate([mockRuleset]);
      
      await plugin.write(content, 'project');
      
      const written = await readFile(join(testDir, ".test", "rules.md"), "utf-8");
      expect(written).toContain("TypeScript Rules");
    });
    
    it("should handle multiple rulesets", async () => {
      const plugin = new TestPlugin();
      const ruleset2: ComposedRuleset = {
        name: "react",
        rules: "# React Rules\n\nUse hooks properly.",
        metadata: {
          set: {
            name: "react",
            version: "1.0.0",
            description: "React rules",
            author: "@test",
            tags: ["react"]
          }
        }
      };
      
      const content = await plugin.generate([mockRuleset, ruleset2]);
      
      expect(content).toContain("TypeScript Rules");
      expect(content).toContain("React Rules");
      expect(content).toContain("Use hooks properly");
    });
    
    it("should create directories if they don't exist", async () => {
      const plugin = new TestPlugin();
      const content = await plugin.generate([mockRuleset]);
      
      await plugin.write(content, 'project');
      
      const written = await readFile(join(testDir, ".test", "rules.md"), "utf-8");
      expect(written).toBe(content);
    });
  });
  
  describe("ClaudeCodePlugin", () => {
    let plugin: ClaudeCodePlugin;
    
    beforeEach(() => {
      plugin = new ClaudeCodePlugin();
    });
    
    it("should have correct metadata", () => {
      expect(plugin.id).toBe("claude-code");
      expect(plugin.name).toBe("Claude Code");
      expect(plugin.description).toContain("Claude");
    });
    
    it("should return correct paths", () => {
      const projectPaths = plugin.getPaths('project');
      expect(projectPaths).toContain(".claude/CLAUDE.md");
      
      const globalPaths = plugin.getPaths('global');
      expect(globalPaths.length).toBeGreaterThan(0);
    });
    
    it("should generate Claude-specific content", async () => {
      const content = await plugin.generate([mockRuleset]);
      
      expect(content).toContain("TypeScript Rules");
      expect(content).not.toContain("<!-- RULESET:"); // Should not include markers
    });
    
    it("should write to .claude directory", async () => {
      const content = await plugin.generate([mockRuleset]);
      await plugin.write(content, 'project');
      
      const written = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(written).toContain("TypeScript Rules");
    });
    
    it("should handle global scope", () => {
      const spy = vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
      const paths = plugin.getPaths('global');
      expect(paths.some(p => p.includes("Library/Application Support"))).toBe(true);
      spy.mockRestore();
    });
  });
  
  describe("CursorPlugin", () => {
    let plugin: CursorPlugin;
    
    beforeEach(() => {
      plugin = new CursorPlugin();
    });
    
    it("should have correct metadata", () => {
      expect(plugin.id).toBe("cursor");
      expect(plugin.name).toBe("Cursor");
    });
    
    it("should return correct project paths", () => {
      const paths = plugin.getPaths('project');
      expect(paths).toContain(".cursor/rules/ruleset.md");
      expect(paths).toContain(".cursorrules");
    });
    
    it("should write to multiple locations", async () => {
      const content = await plugin.generate([mockRuleset]);
      await plugin.write(content, 'project');
      
      // Check .cursor/rules/ruleset.md
      const rules = await readFile(join(testDir, ".cursor", "rules", "ruleset.md"), "utf-8");
      expect(rules).toContain("TypeScript Rules");
      
      // Check .cursorrules
      const cursorrules = await readFile(join(testDir, ".cursorrules"), "utf-8");
      expect(cursorrules).toContain("TypeScript Rules");
    });
  });
  
  describe("WindsurfPlugin", () => {
    let plugin: WindsurfPlugin;
    
    beforeEach(() => {
      plugin = new WindsurfPlugin();
    });
    
    it("should have correct metadata", () => {
      expect(plugin.id).toBe("windsurf");
      expect(plugin.name).toBe("Windsurf");
    });
    
    it("should return correct paths", () => {
      const paths = plugin.getPaths('project');
      expect(paths).toContain(".windsurf/rules/ruleset.md");
    });
    
    it("should write to .windsurf directory", async () => {
      const content = await plugin.generate([mockRuleset]);
      await plugin.write(content, 'project');
      
      const written = await readFile(join(testDir, ".windsurf", "rules", "ruleset.md"), "utf-8");
      expect(written).toContain("TypeScript Rules");
    });
  });
  
  describe("CopilotPlugin", () => {
    let plugin: CopilotPlugin;
    
    beforeEach(() => {
      plugin = new CopilotPlugin();
    });
    
    it("should have correct metadata", () => {
      expect(plugin.id).toBe("copilot");
      expect(plugin.name).toBe("GitHub Copilot");
    });
    
    it("should return correct paths", () => {
      const paths = plugin.getPaths('project');
      expect(paths).toContain(".github/copilot/instructions.md");
    });
    
    it("should write to .github/copilot directory", async () => {
      const content = await plugin.generate([mockRuleset]);
      await plugin.write(content, 'project');
      
      const written = await readFile(join(testDir, ".github", "copilot", "instructions.md"), "utf-8");
      expect(written).toContain("TypeScript Rules");
    });
  });
  
  describe("AgentsMdPlugin", () => {
    let plugin: AgentsMdPlugin;
    
    beforeEach(() => {
      plugin = new AgentsMdPlugin();
    });
    
    it("should have correct metadata", () => {
      expect(plugin.id).toBe("agents-md");
      expect(plugin.name).toBe("AGENTS.md");
    });
    
    it("should return correct paths", () => {
      const paths = plugin.getPaths('project');
      expect(paths).toContain("AGENTS.md");
    });
    
    it("should write to root directory", async () => {
      const content = await plugin.generate([mockRuleset]);
      await plugin.write(content, 'project');
      
      const written = await readFile(join(testDir, "AGENTS.md"), "utf-8");
      expect(written).toContain("TypeScript Rules");
    });
    
    it("should format with proper sections", async () => {
      const ruleset2: ComposedRuleset = {
        name: "react",
        rules: "# React Rules\n\nUse hooks.",
        metadata: {
          set: {
            name: "react",
            version: "1.0.0",
            description: "React rules",
            author: "@test",
            tags: ["react"]
          }
        }
      };
      
      const content = await plugin.generate([mockRuleset, ruleset2]);
      
      expect(content).toContain("# Agent Instructions");
      expect(content).toContain("## TypeScript");
      expect(content).toContain("## React");
    });
  });
  
  describe("Plugin Registry", () => {
    it("should list all available plugins", async () => {
      const { PluginRegistry } = await import("../../src/destinations/plugin-registry");
      const registry = new PluginRegistry();
      
      const plugins = registry.getAllPlugins();
      expect(plugins.length).toBeGreaterThanOrEqual(5);
      
      const ids = plugins.map(p => p.id);
      expect(ids).toContain("claude-code");
      expect(ids).toContain("cursor");
      expect(ids).toContain("windsurf");
      expect(ids).toContain("copilot");
      expect(ids).toContain("agents-md");
    });
    
    it("should get plugin by id", async () => {
      const { PluginRegistry } = await import("../../src/destinations/plugin-registry");
      const registry = new PluginRegistry();
      
      const plugin = registry.getPlugin("claude-code");
      expect(plugin).toBeDefined();
      expect(plugin?.id).toBe("claude-code");
    });
    
    it("should return undefined for unknown plugin", async () => {
      const { PluginRegistry } = await import("../../src/destinations/plugin-registry");
      const registry = new PluginRegistry();
      
      const plugin = registry.getPlugin("unknown");
      expect(plugin).toBeUndefined();
    });
  });
});