// TLDR: Configuration management for branch-diffs tool

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface BranchDiffsConfig {
  output: {
    /** Directory to store generated reports */
    directory: string;
    /** Base filename without timestamp */
    baseFilename: string;
    /** Whether to include timestamp in filename */
    includeTimestamp: boolean;
    /** Timestamp format template */
    timestampFormat: string;
    /** Delimiter between timestamp and base filename */
    delimiter: string;
    /** Output formats to generate */
    formats: Array<'json' | 'md'>;
  };
  diff: {
    /** Patterns to exclude from diffs */
    excludePatterns: string[];
    /** Git diff options */
    contextLines?: number;
    /** Whether to include binary files in stats */
    includeBinary?: boolean;
  };
  git: {
    /** Default target branch */
    defaultTarget: string;
    /** Default scope for branch filtering */
    defaultScope: 'all' | 'local' | 'remote';
    /** Branch filtering configuration */
    branch: {
      /** Global branches to always include */
      include: string[];
      /** Global branches to always exclude */
      exclude: string[];
      /** Named patterns for branch groups */
      patterns: Record<string, string[]>;
    };
  };
}

export const DEFAULT_CONFIG: BranchDiffsConfig = {
  output: {
    directory: '.',
    baseFilename: 'branch-diffs-report',
    includeTimestamp: true,
    timestampFormat: 'YYYYMMDDhhmm',
    delimiter: '-',
    formats: ['json', 'md']
  },
  diff: {
    excludePatterns: [':!dist/**', ':!*.snap', ':!node_modules/**'],
    contextLines: 3,
    includeBinary: false
  },
  git: {
    defaultTarget: 'main',
    defaultScope: 'all',
    branch: {
      include: [],
      exclude: ['temp/*', 'backup/*'],
      patterns: {
        'agents': ['codex/*', 'jules/*', 'copilot/*', 'cursor/*', 'windsurf/*', '!*/old-*', '!*/deprecated'],
        'features': ['feature/*', 'feat/*', '!feature/deprecated'],
        'hotfixes': ['hotfix/*', 'fix/*', '*-urgent', 'emergency/*']
      }
    }
  }
};

/**
 * Generate timestamp string from format template
 */
export function generateTimestamp(format: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('hh', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * Generate filename from config for a specific format
 */
export function generateFilename(config: BranchDiffsConfig['output'], format: 'json' | 'md'): string {
  const { baseFilename, includeTimestamp, timestampFormat, delimiter } = config;
  
  if (includeTimestamp) {
    const timestamp = generateTimestamp(timestampFormat);
    return `${timestamp}${delimiter}${baseFilename}.${format}`;
  }
  
  return `${baseFilename}.${format}`;
}

/**
 * Generate all filenames for configured formats
 */
export function generateFilenames(config: BranchDiffsConfig['output']): Record<'json' | 'md', string> {
  return {
    json: generateFilename(config, 'json'),
    md: generateFilename(config, 'md')
  };
}

/**
 * Load configuration from file or return defaults
 */
export function loadConfig(configPath: string = 'branch-diffs.config.json'): BranchDiffsConfig {
  if (existsSync(configPath)) {
    try {
      const configData = readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(configData);
      
      // Deep merge with defaults
      return {
        output: { ...DEFAULT_CONFIG.output, ...userConfig.output },
        diff: { ...DEFAULT_CONFIG.diff, ...userConfig.diff },
        git: { ...DEFAULT_CONFIG.git, ...userConfig.git }
      };
    } catch (error) {
      console.warn(`Warning: Could not parse config file ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: BranchDiffsConfig, configPath: string = 'branch-diffs.config.json'): void {
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new Error(`Failed to save config to ${configPath}: ${error}`);
  }
}

/**
 * Generate full output paths for all configured formats
 */
export function getOutputPaths(config: BranchDiffsConfig): Record<'json' | 'md', string> {
  const filenames = generateFilenames(config.output);
  
  return {
    json: join(config.output.directory, filenames.json),
    md: join(config.output.directory, filenames.md)
  };
}

/**
 * Generate full output path for a specific format
 */
export function getOutputPath(config: BranchDiffsConfig, format: 'json' | 'md'): string {
  const filename = generateFilename(config.output, format);
  return join(config.output.directory, filename);
}