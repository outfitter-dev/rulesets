import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Global configuration for Rulesets.
 * Handles detection and management of global rulesets directory.
 */

export interface GlobalConfig {
  version: string;
  defaultDestination?: string;
  defaults?: {
    autoDetect?: boolean;
    autoSuggest?: boolean;
    installLocation?: 'project' | 'global';
  };
  destinations?: Record<string, string>;
  detection?: {
    patterns?: Record<string, string[]>;
    dependencies?: Record<string, string[]>;
  };
}

export class GlobalConfigManager {
  private configPath: string | null = null;
  private config: GlobalConfig | null = null;
  
  /**
   * Get the global rulesets directory path.
   * Priority order:
   * 1. RULESETS_HOME environment variable
   * 2. ~/.rulesets (default)
   * 3. $XDG_CONFIG_HOME/rulesets (Linux/Unix)
   * 4. ~/Library/Application Support/rulesets (macOS)
   */
  static getGlobalRulesetsDir(): string {
    // Check environment variable first
    const envPath = process.env.RULESETS_HOME;
    if (envPath) {
      return path.resolve(envPath);
    }
    
    // Default path
    const homedir = os.homedir();
    const defaultPath = path.join(homedir, '.rulesets');
    
    // Check if default exists
    try {
      const stats = fs.stat(defaultPath);
      if (stats) return defaultPath;
    } catch {
      // Default doesn't exist, check alternatives
    }
    
    // Check XDG config (Linux/Unix)
    const xdgConfig = process.env.XDG_CONFIG_HOME;
    if (xdgConfig) {
      const xdgPath = path.join(xdgConfig, 'rulesets');
      try {
        const stats = fs.stat(xdgPath);
        if (stats) return xdgPath;
      } catch {
        // XDG path doesn't exist
      }
    }
    
    // Check macOS Application Support
    if (process.platform === 'darwin') {
      const macPath = path.join(homedir, 'Library', 'Application Support', 'rulesets');
      try {
        const stats = fs.stat(macPath);
        if (stats) return macPath;
      } catch {
        // macOS path doesn't exist
      }
    }
    
    // Return default path if nothing exists
    return defaultPath;
  }
  
  /**
   * Initialize the global rulesets directory structure.
   */
  async initialize(): Promise<void> {
    const dir = GlobalConfigManager.getGlobalRulesetsDir();
    
    // Create directory structure
    await fs.mkdir(path.join(dir, 'sets'), { recursive: true });
    await fs.mkdir(path.join(dir, 'packs'), { recursive: true });
    await fs.mkdir(path.join(dir, 'commands'), { recursive: true });
    
    // Create default config.toml if it doesn't exist
    const configPath = path.join(dir, 'config.toml');
    try {
      await fs.access(configPath);
    } catch {
      // Config doesn't exist, create default
      const defaultConfig = this.getDefaultConfig();
      await this.writeConfig(configPath, defaultConfig);
    }
    
    this.configPath = configPath;
  }
  
  /**
   * Load the global configuration.
   */
  async loadConfig(): Promise<GlobalConfig> {
    if (!this.configPath) {
      await this.initialize();
    }
    
    try {
      const content = await fs.readFile(this.configPath!, 'utf-8');
      // TODO: Parse TOML properly (need to add @iarna/toml dependency)
      // For now, return default config
      this.config = this.getDefaultConfig();
      return this.config;
    } catch (error) {
      // Return default config if file doesn't exist
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }
  
  /**
   * Save the configuration.
   */
  async saveConfig(config: GlobalConfig): Promise<void> {
    if (!this.configPath) {
      await this.initialize();
    }
    
    await this.writeConfig(this.configPath!, config);
    this.config = config;
  }
  
  /**
   * Get the default configuration.
   */
  private getDefaultConfig(): GlobalConfig {
    return {
      version: '1.0.0',
      defaultDestination: 'agents-md',
      defaults: {
        autoDetect: true,
        autoSuggest: true,
        installLocation: 'project',
      },
      destinations: {
        claude_code_global: '~/.claude/CLAUDE.md',
        claude_code_commands: '~/.claude/commands/',
      },
      detection: {
        patterns: {
          'package.json': ['typescript', 'node'],
          'cargo.toml': ['rust'],
          'requirements.txt': ['python'],
          'go.mod': ['go'],
          'Gemfile': ['ruby'],
          'composer.json': ['php'],
          'pom.xml': ['java'],
          'build.gradle': ['java', 'kotlin'],
        },
        dependencies: {
          '@types/react': ['react'],
          'vitest': ['testing-vitest'],
          'jest': ['testing-jest'],
          'express': ['express'],
          'hono': ['hono'],
          'next': ['nextjs'],
          'vue': ['vue'],
          'svelte': ['svelte'],
          'tailwindcss': ['tailwind'],
        },
      },
    };
  }
  
  /**
   * Write config to file (simplified TOML-like format for now).
   */
  private async writeConfig(configPath: string, config: GlobalConfig): Promise<void> {
    const lines: string[] = [
      '[rulesets]',
      `version = "${config.version}"`,
      `default_destination = "${config.defaultDestination || 'agents-md'}"`,
      '',
      '[defaults]',
      `auto_detect = ${config.defaults?.autoDetect ?? true}`,
      `auto_suggest = ${config.defaults?.autoSuggest ?? true}`,
      `install_location = "${config.defaults?.installLocation || 'project'}"`,
      '',
    ];
    
    if (config.destinations) {
      lines.push('[destinations]');
      for (const [key, value] of Object.entries(config.destinations)) {
        lines.push(`${key} = "${value}"`);
      }
      lines.push('');
    }
    
    if (config.detection?.patterns) {
      lines.push('[detection.patterns]');
      for (const [pattern, sets] of Object.entries(config.detection.patterns)) {
        lines.push(`"${pattern}" = [${sets.map(s => `"${s}"`).join(', ')}]`);
      }
      lines.push('');
    }
    
    if (config.detection?.dependencies) {
      lines.push('[detection.dependencies]');
      for (const [dep, sets] of Object.entries(config.detection.dependencies)) {
        lines.push(`"${dep}" = [${sets.map(s => `"${s}"`).join(', ')}]`);
      }
      lines.push('');
    }
    
    await fs.writeFile(configPath, lines.join('\n'), 'utf-8');
  }
  
  /**
   * Check if a global ruleset exists.
   */
  async rulesetExists(name: string): Promise<boolean> {
    const dir = GlobalConfigManager.getGlobalRulesetsDir();
    const setPath = path.join(dir, 'sets', name);
    
    try {
      await fs.access(setPath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * List available global rulesets.
   */
  async listRulesets(): Promise<string[]> {
    const dir = GlobalConfigManager.getGlobalRulesetsDir();
    const setsDir = path.join(dir, 'sets');
    
    try {
      const entries = await fs.readdir(setsDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }
  
  /**
   * List available packs.
   */
  async listPacks(): Promise<string[]> {
    const dir = GlobalConfigManager.getGlobalRulesetsDir();
    const packsDir = path.join(dir, 'packs');
    
    try {
      const entries = await fs.readdir(packsDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }
  
  /**
   * List available global commands.
   */
  async listCommands(): Promise<string[]> {
    const dir = GlobalConfigManager.getGlobalRulesetsDir();
    const commandsDir = path.join(dir, 'commands');
    
    try {
      const entries = await fs.readdir(commandsDir);
      return entries
        .filter(file => file.endsWith('.md'))
        .map(file => path.basename(file, '.md'));
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const globalConfig = new GlobalConfigManager();