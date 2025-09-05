import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { InstallationManager, type InstallationRecord, type SyncResult } from "../../src/installation/installation-manager";
import { GlobalConfig } from "../../src/config/global-config";
import { RulesetManager } from "../../src/rulesets/ruleset-manager";

describe("InstallationManager", () => {
  let testDir: string;
  let globalDir: string;
  let manager: InstallationManager;
  
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "install-test-"));
    globalDir = await mkdtemp(join(tmpdir(), "global-test-"));
    
    // Mock global directory
    vi.spyOn(GlobalConfig.prototype, 'getGlobalDirectory').mockReturnValue(globalDir);
    
    // Create test global rulesets
    await createTestRuleset(globalDir, "typescript", "1.0.0", "# TypeScript Rules\n\nUse strict types.");
    await createTestRuleset(globalDir, "react", "1.2.0", "# React Rules\n\nUse hooks properly.");
    
    // Change to test directory
    process.chdir(testDir);
    
    manager = new InstallationManager();
  });
  
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(testDir, { recursive: true, force: true });
    await rm(globalDir, { recursive: true, force: true });
  });
  
  describe("Installation", () => {
    it("should install a ruleset to specified destinations", async () => {
      const result = await manager.installRuleset("typescript", ["claude-code", "cursor"]);
      
      expect(result.success).toBe(true);
      expect(result.installedTo).toEqual(["claude-code", "cursor"]);
      
      // Check files were created
      const claudeContent = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(claudeContent).toContain("TypeScript Rules");
      
      const cursorContent = await readFile(join(testDir, ".cursor", "rules", "ruleset.md"), "utf-8");
      expect(cursorContent).toContain("TypeScript Rules");
    });
    
    it("should track installations in installed.json", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      const tracking = await manager.getInstalledRulesets();
      expect(tracking["typescript"]).toBeDefined();
      expect(tracking["typescript"].version).toBe("1.0.0");
      expect(tracking["typescript"].source).toBe("global");
      expect(tracking["typescript"].destinations).toContain("claude-code");
      expect(tracking["typescript"].installedAt).toBeDefined();
    });
    
    it("should handle multiple ruleset installations", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      await manager.installRuleset("react", ["claude-code", "cursor"]);
      
      const tracking = await manager.getInstalledRulesets();
      expect(Object.keys(tracking)).toHaveLength(2);
      expect(tracking["typescript"]).toBeDefined();
      expect(tracking["react"]).toBeDefined();
    });
    
    it("should append to existing destination files", async () => {
      // Pre-create a destination file
      await mkdir(join(testDir, ".claude"), { recursive: true });
      await writeFile(join(testDir, ".claude", "CLAUDE.md"), "# Existing Rules\n\nKeep this content.");
      
      await manager.installRuleset("typescript", ["claude-code"]);
      
      const content = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(content).toContain("Existing Rules");
      expect(content).toContain("TypeScript Rules");
    });
    
    it("should detect and prevent duplicate installations", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      const result = await manager.installRuleset("typescript", ["claude-code"], { force: false });
      expect(result.success).toBe(false);
      expect(result.reason).toContain("already installed");
    });
    
    it("should allow force reinstallation", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      // Modify the global ruleset
      await createTestRuleset(globalDir, "typescript", "1.1.0", "# TypeScript Rules v1.1\n\nUpdated rules.");
      
      const result = await manager.installRuleset("typescript", ["claude-code"], { force: true });
      expect(result.success).toBe(true);
      
      const content = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(content).toContain("TypeScript Rules v1.1");
    });
  });
  
  describe("Sync", () => {
    beforeEach(async () => {
      // Install initial rulesets
      await manager.installRuleset("typescript", ["claude-code"]);
      await manager.installRuleset("react", ["cursor"]);
    });
    
    it("should detect updates in global rulesets", async () => {
      // Update global ruleset
      await createTestRuleset(globalDir, "typescript", "1.1.0", "# TypeScript Rules v1.1");
      
      const updates = await manager.checkForUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].name).toBe("typescript");
      expect(updates[0].currentVersion).toBe("1.0.0");
      expect(updates[0].availableVersion).toBe("1.1.0");
    });
    
    it("should sync updates from global", async () => {
      // Update global ruleset
      await createTestRuleset(globalDir, "typescript", "1.1.0", "# TypeScript Rules v1.1\n\nNew content.");
      
      const result = await manager.syncInstalledRulesets();
      
      expect(result.updated).toContain("typescript");
      expect(result.failed).toHaveLength(0);
      
      // Check file was updated
      const content = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(content).toContain("TypeScript Rules v1.1");
      
      // Check tracking was updated
      const tracking = await manager.getInstalledRulesets();
      expect(tracking["typescript"].version).toBe("1.1.0");
    });
    
    it("should preserve local modifications during sync", async () => {
      // Track a local modification
      await manager.trackModification("typescript", {
        type: "append",
        content: "\n## Local Addition\n\nCustom rules here.",
        destination: "claude-code"
      });
      
      // Update global ruleset
      await createTestRuleset(globalDir, "typescript", "1.1.0", "# TypeScript Rules v1.1");
      
      const result = await manager.syncInstalledRulesets({ preserveLocal: true });
      
      expect(result.updated).toContain("typescript");
      expect(result.preserved).toContain("typescript");
      
      const content = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(content).toContain("TypeScript Rules v1.1");
      expect(content).toContain("Local Addition");
    });
    
    it("should handle sync conflicts", async () => {
      // Track local modification
      await manager.trackModification("typescript", {
        type: "replace",
        pattern: /Use strict types/,
        replacement: "Always use strict types",
        destination: "claude-code"
      });
      
      // Update global with conflicting change
      await createTestRuleset(globalDir, "typescript", "1.1.0", "# TypeScript Rules\n\nNever use any types.");
      
      const result = await manager.syncInstalledRulesets({ preserveLocal: true });
      
      expect(result.conflicts).toContain("typescript");
      
      // Should create conflict file
      const conflictPath = join(testDir, ".rulesets", "conflicts", "typescript.md");
      const conflictContent = await readFile(conflictPath, "utf-8");
      expect(conflictContent).toContain("CONFLICT");
    });
    
    it("should sync only specific rulesets when requested", async () => {
      await createTestRuleset(globalDir, "typescript", "1.1.0", "# Updated TypeScript");
      await createTestRuleset(globalDir, "react", "1.3.0", "# Updated React");
      
      const result = await manager.syncInstalledRulesets({ only: ["typescript"] });
      
      expect(result.updated).toContain("typescript");
      expect(result.updated).not.toContain("react");
      
      const tracking = await manager.getInstalledRulesets();
      expect(tracking["typescript"].version).toBe("1.1.0");
      expect(tracking["react"].version).toBe("1.2.0"); // Unchanged
    });
  });
  
  describe("Update", () => {
    it("should update a specific ruleset", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      // Update global
      await createTestRuleset(globalDir, "typescript", "2.0.0", "# TypeScript Rules v2");
      
      const result = await manager.updateRuleset("typescript");
      
      expect(result.success).toBe(true);
      expect(result.previousVersion).toBe("1.0.0");
      expect(result.newVersion).toBe("2.0.0");
      
      const content = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(content).toContain("TypeScript Rules v2");
    });
    
    it("should fail to update non-installed ruleset", async () => {
      const result = await manager.updateRuleset("nonexistent");
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain("not installed");
    });
    
    it("should handle update with no changes", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      const result = await manager.updateRuleset("typescript");
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain("already up to date");
    });
  });
  
  describe("Removal", () => {
    it("should remove ruleset from all destinations", async () => {
      await manager.installRuleset("typescript", ["claude-code", "cursor"]);
      
      const result = await manager.removeRuleset("typescript");
      
      expect(result.success).toBe(true);
      expect(result.removedFrom).toEqual(["claude-code", "cursor"]);
      
      const tracking = await manager.getInstalledRulesets();
      expect(tracking["typescript"]).toBeUndefined();
    });
    
    it("should handle removal from specific destinations", async () => {
      await manager.installRuleset("typescript", ["claude-code", "cursor"]);
      
      const result = await manager.removeRuleset("typescript", { destinations: ["cursor"] });
      
      expect(result.success).toBe(true);
      expect(result.removedFrom).toEqual(["cursor"]);
      
      const tracking = await manager.getInstalledRulesets();
      expect(tracking["typescript"].destinations).toEqual(["claude-code"]);
    });
    
    it("should clean up empty destination directories", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      await manager.removeRuleset("typescript");
      
      // Directory should be removed if empty
      const claudeExists = await exists(join(testDir, ".claude"));
      expect(claudeExists).toBe(false);
    });
  });
  
  describe("Modification Tracking", () => {
    it("should track local modifications", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      await manager.trackModification("typescript", {
        type: "append",
        content: "\n## Custom Section",
        destination: "claude-code",
        timestamp: new Date().toISOString()
      });
      
      const mods = await manager.getModifications("typescript");
      expect(mods).toHaveLength(1);
      expect(mods[0].type).toBe("append");
    });
    
    it("should apply modifications during reinstall", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      await manager.trackModification("typescript", {
        type: "append",
        content: "\n## Keep This",
        destination: "claude-code"
      });
      
      // Reinstall
      await manager.installRuleset("typescript", ["claude-code"], { force: true, preserveLocal: true });
      
      const content = await readFile(join(testDir, ".claude", "CLAUDE.md"), "utf-8");
      expect(content).toContain("Keep This");
    });
    
    it("should clear modifications when requested", async () => {
      await manager.installRuleset("typescript", ["claude-code"]);
      
      await manager.trackModification("typescript", {
        type: "append",
        content: "\n## Custom",
        destination: "claude-code"
      });
      
      await manager.clearModifications("typescript");
      
      const mods = await manager.getModifications("typescript");
      expect(mods).toHaveLength(0);
    });
  });
});

async function createTestRuleset(globalDir: string, name: string, version: string, content: string) {
  const rulesetDir = join(globalDir, "sets", name);
  await mkdir(rulesetDir, { recursive: true });
  
  // Use Bun.write to ensure consistency with how Ruleset reads files
  await Bun.write(join(rulesetDir, "rules.md"), content);
  
  const meta = `[set]
name = "${name}"
version = "${version}"
description = "Test ${name} ruleset"
author = "Test"
tags = ["test"]
`;
  
  await Bun.write(join(rulesetDir, "meta.toml"), meta);
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}