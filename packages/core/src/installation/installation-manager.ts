import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { GlobalConfig } from '../config/global-config';
import { RulesetManager } from '../rulesets/ruleset-manager';
import { Ruleset } from '../rulesets/ruleset';

export interface InstallationRecord {
  version: string;
  source: 'global' | 'remote' | 'local';
  destinations: string[];
  installedAt: string;
  lastSync?: string;
  checksum?: string;
}

export interface Modification {
  type: 'append' | 'replace' | 'prepend';
  content?: string;
  pattern?: RegExp;
  replacement?: string;
  destination: string;
  timestamp?: string;
}

export interface InstallResult {
  success: boolean;
  installedTo?: string[];
  reason?: string;
  version?: string;
}

export interface UpdateResult {
  success: boolean;
  previousVersion?: string;
  newVersion?: string;
  reason?: string;
}

export interface RemoveResult {
  success: boolean;
  removedFrom?: string[];
  reason?: string;
}

export interface SyncResult {
  updated: string[];
  failed: string[];
  conflicts?: string[];
  preserved?: string[];
}

export interface UpdateInfo {
  name: string;
  currentVersion: string;
  availableVersion: string;
}

interface InstallOptions {
  force?: boolean;
  preserveLocal?: boolean;
}

interface SyncOptions {
  preserveLocal?: boolean;
  only?: string[];
}

interface RemoveOptions {
  destinations?: string[];
}

interface TrackedData {
  installed: Record<string, InstallationRecord>;
  modifications: Record<string, Modification[]>;
}

export class InstallationManager {
  private projectDir: string;
  private trackingFile: string;
  private globalConfig: GlobalConfig;
  private rulesetManager: RulesetManager;
  
  constructor(projectDir: string = process.cwd()) {
    this.projectDir = projectDir;
    this.trackingFile = join(projectDir, '.rulesets', 'installed.json');
    this.globalConfig = new GlobalConfig();
    const globalDir = this.globalConfig.getGlobalDirectory();
    this.rulesetManager = new RulesetManager({ globalDir });
  }
  
  /**
   * Install a ruleset to specified destinations.
   */
  async installRuleset(
    name: string,
    destinations: string[],
    options: InstallOptions = {}
  ): Promise<InstallResult> {
    const tracking = await this.loadTracking();
    
    // Check if already installed
    if (!options.force && tracking.installed[name]) {
      return {
        success: false,
        reason: `Ruleset '${name}' is already installed. Use --force to reinstall.`
      };
    }
    
    try {
      // Compose the ruleset
      const composed = await this.rulesetManager.compose(name);
      
      // Apply local modifications if preserving
      let content = composed.rules;
      if (options.preserveLocal && tracking.modifications[name]) {
        content = await this.applyModifications(content, tracking.modifications[name]);
      }
      
      // Install to each destination
      const installedTo: string[] = [];
      for (const dest of destinations) {
        const installed = await this.installToDestination(dest, content, name);
        if (installed) {
          installedTo.push(dest);
        }
      }
      
      // Update tracking
      tracking.installed[name] = {
        version: composed.metadata.set.version,
        source: 'global',
        destinations: installedTo,
        installedAt: new Date().toISOString()
      };
      
      await this.saveTracking(tracking);
      
      return {
        success: true,
        installedTo,
        version: composed.metadata.set.version
      };
    } catch (error: any) {
      return {
        success: false,
        reason: error.message
      };
    }
  }
  
  /**
   * Sync installed rulesets with their sources.
   */
  async syncInstalledRulesets(options: SyncOptions = {}): Promise<SyncResult> {
    const tracking = await this.loadTracking();
    const result: SyncResult = {
      updated: [],
      failed: [],
      conflicts: [],
      preserved: []
    };
    
    const toSync = options.only || Object.keys(tracking.installed);
    
    for (const name of toSync) {
      if (!tracking.installed[name]) continue;
      
      try {
        const updates = await this.checkRulesetUpdates(name);
        if (!updates) continue;
        
        // Force fresh read from global by creating new manager instance
        const freshManager = new RulesetManager({ 
          globalDir: this.globalConfig.getGlobalDirectory() 
        });
        const composed = await freshManager.compose(name);
        let content = composed.rules;
        
        // Handle local modifications
        if (options.preserveLocal && tracking.modifications[name]) {
          try {
            content = await this.applyModifications(content, tracking.modifications[name]);
            result.preserved?.push(name);
          } catch (e) {
            // Conflict detected
            await this.createConflictFile(name, composed.rules, tracking.modifications[name]);
            result.conflicts?.push(name);
            continue;
          }
        }
        
        // Update all destinations
        for (const dest of tracking.installed[name].destinations) {
          await this.installToDestination(dest, content, name);
        }
        
        // Update tracking
        tracking.installed[name].version = composed.metadata.set.version;
        tracking.installed[name].lastSync = new Date().toISOString();
        
        result.updated.push(name);
      } catch (error) {
        result.failed.push(name);
      }
    }
    
    await this.saveTracking(tracking);
    return result;
  }
  
  /**
   * Update a specific ruleset.
   */
  async updateRuleset(name: string): Promise<UpdateResult> {
    const tracking = await this.loadTracking();
    
    if (!tracking.installed[name]) {
      return {
        success: false,
        reason: `Ruleset '${name}' is not installed`
      };
    }
    
    const updates = await this.checkRulesetUpdates(name);
    if (!updates) {
      return {
        success: false,
        reason: `Ruleset '${name}' is already up to date`
      };
    }
    
    const previousVersion = tracking.installed[name].version;
    
    // Reinstall with latest version
    const result = await this.installRuleset(
      name,
      tracking.installed[name].destinations,
      { force: true, preserveLocal: true }
    );
    
    if (result.success) {
      return {
        success: true,
        previousVersion,
        newVersion: result.version
      };
    }
    
    return {
      success: false,
      reason: result.reason
    };
  }
  
  /**
   * Remove a ruleset from specified or all destinations.
   */
  async removeRuleset(name: string, options: RemoveOptions = {}): Promise<RemoveResult> {
    const tracking = await this.loadTracking();
    
    if (!tracking.installed[name]) {
      return {
        success: false,
        reason: `Ruleset '${name}' is not installed`
      };
    }
    
    const destinations = options.destinations || tracking.installed[name].destinations;
    const removedFrom: string[] = [];
    
    for (const dest of destinations) {
      const removed = await this.removeFromDestination(dest, name);
      if (removed) {
        removedFrom.push(dest);
      }
    }
    
    // Update tracking
    if (options.destinations) {
      // Partial removal
      tracking.installed[name].destinations = tracking.installed[name].destinations
        .filter(d => !destinations.includes(d));
      
      if (tracking.installed[name].destinations.length === 0) {
        delete tracking.installed[name];
        delete tracking.modifications[name];
      }
    } else {
      // Full removal
      delete tracking.installed[name];
      delete tracking.modifications[name];
    }
    
    await this.saveTracking(tracking);
    
    return {
      success: true,
      removedFrom
    };
  }
  
  /**
   * Track a local modification to a ruleset.
   */
  async trackModification(name: string, modification: Modification): Promise<void> {
    const tracking = await this.loadTracking();
    
    if (!tracking.modifications[name]) {
      tracking.modifications[name] = [];
    }
    
    tracking.modifications[name].push({
      ...modification,
      timestamp: modification.timestamp || new Date().toISOString()
    });
    
    await this.saveTracking(tracking);
  }
  
  /**
   * Get modifications for a ruleset.
   */
  async getModifications(name: string): Promise<Modification[]> {
    const tracking = await this.loadTracking();
    return tracking.modifications[name] || [];
  }
  
  /**
   * Clear modifications for a ruleset.
   */
  async clearModifications(name: string): Promise<void> {
    const tracking = await this.loadTracking();
    delete tracking.modifications[name];
    await this.saveTracking(tracking);
  }
  
  /**
   * Get all installed rulesets.
   */
  async getInstalledRulesets(): Promise<Record<string, InstallationRecord>> {
    const tracking = await this.loadTracking();
    return tracking.installed;
  }
  
  /**
   * Check for available updates.
   */
  async checkForUpdates(): Promise<UpdateInfo[]> {
    const tracking = await this.loadTracking();
    const updates: UpdateInfo[] = [];
    
    for (const [name, record] of Object.entries(tracking.installed)) {
      const updateInfo = await this.checkRulesetUpdates(name);
      if (updateInfo) {
        updates.push(updateInfo);
      }
    }
    
    return updates;
  }
  
  // Private helper methods
  
  private async loadTracking(): Promise<TrackedData> {
    try {
      const content = await fs.readFile(this.trackingFile, 'utf-8');
      const data = JSON.parse(content);
      return {
        installed: data.installed || {},
        modifications: data.modified || data.modifications || {}
      };
    } catch {
      return { installed: {}, modifications: {} };
    }
  }
  
  private async saveTracking(data: TrackedData): Promise<void> {
    await fs.mkdir(dirname(this.trackingFile), { recursive: true });
    
    const content = JSON.stringify({
      "_comment": "Auto-generated by rulesets CLI - do not edit manually",
      installed: data.installed,
      modified: data.modifications
    }, null, 2);
    
    await fs.writeFile(this.trackingFile, content, 'utf-8');
  }
  
  private async installToDestination(
    destination: string,
    content: string,
    rulesetName: string
  ): Promise<boolean> {
    const destinationPaths: Record<string, string> = {
      "claude-code": ".claude/CLAUDE.md",
      "cursor": ".cursor/rules/ruleset.md",
      "windsurf": ".windsurf/rules/ruleset.md",
      "agents-md": "AGENTS.md",
      "copilot": ".github/copilot/instructions.md",
    };
    
    const relativePath = destinationPaths[destination];
    if (!relativePath) return false;
    
    const fullPath = join(this.projectDir, relativePath);
    const dir = dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    
    // Check if file exists and append if needed
    let existingContent = '';
    try {
      existingContent = await fs.readFile(fullPath, 'utf-8');
    } catch {
      // File doesn't exist
    }
    
    // Add separator if appending
    const separator = existingContent ? '\n\n---\n\n' : '';
    const header = `<!-- RULESET: ${rulesetName} -->\n`;
    
    // Remove old version if exists
    if (existingContent.includes(`<!-- RULESET: ${rulesetName} -->`)) {
      const regex = new RegExp(
        `<!-- RULESET: ${rulesetName} -->.*?(?=<!-- RULESET:|$)`,
        'gs'
      );
      existingContent = existingContent.replace(regex, '');
    }
    
    const finalContent = existingContent + separator + header + content;
    await fs.writeFile(fullPath, finalContent.trim() + '\n', 'utf-8');
    
    return true;
  }
  
  private async removeFromDestination(
    destination: string,
    rulesetName: string
  ): Promise<boolean> {
    const destinationPaths: Record<string, string> = {
      "claude-code": ".claude/CLAUDE.md",
      "cursor": ".cursor/rules/ruleset.md",
      "windsurf": ".windsurf/rules/ruleset.md",
      "agents-md": "AGENTS.md",
      "copilot": ".github/copilot/instructions.md",
    };
    
    const relativePath = destinationPaths[destination];
    if (!relativePath) return false;
    
    const fullPath = join(this.projectDir, relativePath);
    
    try {
      let content = await fs.readFile(fullPath, 'utf-8');
      
      // Remove ruleset section
      const regex = new RegExp(
        `<!-- RULESET: ${rulesetName} -->.*?(?=<!-- RULESET:|$)`,
        'gs'
      );
      content = content.replace(regex, '');
      
      // Clean up multiple separators
      content = content.replace(/(\n---\n){2,}/g, '\n---\n');
      content = content.trim();
      
      if (content) {
        await fs.writeFile(fullPath, content + '\n', 'utf-8');
      } else {
        // Remove empty file and potentially empty directory
        await fs.unlink(fullPath);
        
        // Try to remove directory if empty
        try {
          const dir = dirname(fullPath);
          const entries = await fs.readdir(dir);
          if (entries.length === 0) {
            await fs.rmdir(dir);
          }
        } catch {
          // Directory not empty or doesn't exist
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  private async checkRulesetUpdates(name: string): Promise<UpdateInfo | null> {
    const tracking = await this.loadTracking();
    const installed = tracking.installed[name];
    
    if (!installed) return null;
    
    try {
      // Get the latest version from global
      const composed = await this.rulesetManager.compose(name);
      const availableVersion = composed.metadata.set.version;
      
      if (availableVersion !== installed.version) {
        return {
          name,
          currentVersion: installed.version,
          availableVersion
        };
      }
    } catch {
      // Ruleset not found in global
    }
    
    return null;
  }
  
  private async applyModifications(
    content: string,
    modifications: Modification[]
  ): Promise<string> {
    let result = content;
    
    for (const mod of modifications) {
      switch (mod.type) {
        case 'append':
          result = result + (mod.content || '');
          break;
        case 'prepend':
          result = (mod.content || '') + result;
          break;
        case 'replace':
          if (mod.pattern && mod.replacement !== undefined) {
            // Check if pattern exists in content
            const patternStr = mod.pattern.toString();
            const regex = new RegExp(patternStr.slice(1, patternStr.lastIndexOf('/')), 
                                   patternStr.slice(patternStr.lastIndexOf('/') + 1));
            if (!result.match(regex)) {
              throw new Error(`Pattern not found for replacement: ${mod.pattern}`);
            }
            result = result.replace(regex, mod.replacement);
          }
          break;
      }
    }
    
    return result;
  }
  
  private async createConflictFile(
    name: string,
    newContent: string,
    modifications: Modification[]
  ): Promise<void> {
    const conflictDir = join(this.projectDir, '.rulesets', 'conflicts');
    await fs.mkdir(conflictDir, { recursive: true });
    
    const conflictPath = join(conflictDir, `${name}.md`);
    const conflictContent = `# CONFLICT: ${name}

## New Version from Global
${newContent}

## Local Modifications
${JSON.stringify(modifications, null, 2)}

## Resolution
To resolve this conflict:
1. Review the changes above
2. Manually update your destination files
3. Clear modifications: rulesets clear-mods ${name}
4. Sync again: rulesets sync ${name}
`;
    
    await fs.writeFile(conflictPath, conflictContent, 'utf-8');
  }
}