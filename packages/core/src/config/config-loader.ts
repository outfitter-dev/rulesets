import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as TOML from '@iarna/toml';
import type { Logger } from '../interfaces';

/**
 * Rulesets configuration structure
 */
export interface RulesetsConfig {
  version?: string;
  defaultDestination?: string;
  destinations?: Record<string, {
    outputPath?: string;
    useAgentsDir?: boolean;
    [key: string]: unknown;
  }>;
  cloneMode?: {
    enabled?: boolean;
    autoDetect?: boolean;
  };
  driftDetection?: {
    enabled?: boolean;
    historyPath?: string;
  };
  [key: string]: unknown;
}

/**
 * Loads Rulesets configuration from various sources.
 * Searches for configuration in this order:
 * 1. .rulesets/rulesets.toml
 * 2. .rulesets/config.toml
 * 3. rulesets.toml (root)
 * 4. .rulesets/rulesets.config.json (legacy)
 */
export class ConfigLoader {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Load configuration from the project.
   */
  async load(rootPath: string = process.cwd()): Promise<RulesetsConfig> {
    const configPaths = [
      path.join(rootPath, '.rulesets', 'rulesets.toml'),
      path.join(rootPath, '.rulesets', 'config.toml'),
      path.join(rootPath, 'rulesets.toml'),
      path.join(rootPath, '.rulesets', 'rulesets.config.json'), // Legacy
    ];
    
    for (const configPath of configPaths) {
      try {
        await fs.access(configPath);
        this.logger.debug(`Found config file: ${configPath}`);
        
        const content = await fs.readFile(configPath, 'utf-8');
        
        if (configPath.endsWith('.toml')) {
          return this.parseToml(content);
        } else if (configPath.endsWith('.json')) {
          this.logger.warn('Using legacy JSON config format. Consider migrating to TOML.');
          return JSON.parse(content);
        }
      } catch (error) {
        // File doesn't exist or can't be read, try next
        continue;
      }
    }
    
    // Return default config if no config file found
    this.logger.debug('No config file found, using defaults');
    return this.getDefaultConfig();
  }
  
  /**
   * Parse TOML configuration.
   */
  private parseToml(content: string): RulesetsConfig {
    try {
      const parsed = TOML.parse(content) as RulesetsConfig;
      return parsed;
    } catch (error) {
      this.logger.error('Failed to parse TOML config:', error);
      throw new Error(`Invalid TOML configuration: ${error}`);
    }
  }
  
  /**
   * Get default configuration.
   */
  private getDefaultConfig(): RulesetsConfig {
    return {
      version: '0.1.0',
      defaultDestination: '.ruleset/',
      destinations: {},
      cloneMode: {
        enabled: true,
        autoDetect: true
      },
      driftDetection: {
        enabled: true,
        historyPath: '.rulesets/history.jsonl'
      }
    };
  }
  
  /**
   * Save configuration to TOML file.
   */
  async save(config: RulesetsConfig, configPath?: string): Promise<void> {
    const targetPath = configPath || path.join(process.cwd(), '.rulesets', 'rulesets.toml');
    const targetDir = path.dirname(targetPath);
    
    // Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true });
    
    // Convert to TOML
    const tomlContent = TOML.stringify(config as any);
    
    // Write file
    await fs.writeFile(targetPath, tomlContent, 'utf-8');
    
    this.logger.info(`Configuration saved to: ${targetPath}`);
  }
  
  /**
   * Migrate legacy JSON config to TOML.
   */
  async migrateFromJson(jsonPath: string, tomlPath?: string): Promise<void> {
    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const config = JSON.parse(jsonContent);
      
      const targetPath = tomlPath || jsonPath.replace('.json', '.toml');
      await this.save(config, targetPath);
      
      this.logger.info(`Migrated config from ${jsonPath} to ${targetPath}`);
      
      // Optionally rename old file
      const backupPath = jsonPath + '.backup';
      await fs.rename(jsonPath, backupPath);
      this.logger.info(`Backed up old config to ${backupPath}`);
    } catch (error) {
      this.logger.error('Failed to migrate config:', error);
      throw error;
    }
  }
}

// Export for convenience
export { ConfigLoader as default };