/**
 * Configuration utilities for file discovery, parsing, and merging
 * Supports both JSONC and TOML formats with robust error handling
 */

import { parse as parseToml } from '@iarna/toml';
import { constants, promises as fs } from 'fs';
import { type ParseError, parse as parseJsonc } from 'jsonc-parser';
import { dirname, join, resolve } from 'path';
import type {
  ConfigFileResult,
  ConfigLoadOptions,
  RulesetConfig,
} from './types';
import { CONFIG_FILE_NAMES, DEFAULT_LOAD_OPTIONS } from './types';
import { getChildLogger } from '../utils/logger';

const logger = getChildLogger('config');

/**
 * Check if a file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find configuration file starting from a directory and searching upward
 */
export async function findConfigFile(
  startPath: string,
  options: ConfigLoadOptions = DEFAULT_LOAD_OPTIONS
): Promise<ConfigFileResult | null> {
  const { maxSearchDepth = 10, searchParents = true } = options;

  let currentPath = resolve(startPath);
  let depth = 0;

  while (depth <= maxSearchDepth) {
    // Try each config file name in order of precedence
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = join(currentPath, fileName);

      if (await fileExists(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const format = getConfigFormat(fileName);

          return {
            filePath,
            format,
            content,
            directory: currentPath,
          };
        } catch (error) {
          // Continue searching if file read fails
          logger.warn({ filePath, error }, 'Failed to read config file');
        }
      }
    }

    if (!searchParents) {
      break;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      // Reached filesystem root
      break;
    }

    currentPath = parentPath;
    depth++;
  }

  return null;
}

/**
 * Determine configuration format from filename
 */
export function getConfigFormat(fileName: string): 'jsonc' | 'toml' {
  if (fileName.endsWith('.toml')) {
    return 'toml';
  }
  return 'jsonc'; // Default to JSONC for .json/.jsonc files
}

/**
 * Parse configuration file content based on format
 */
export async function parseConfigContent(
  content: string,
  format: 'jsonc' | 'toml',
  filePath: string
): Promise<RulesetConfig> {
  try {
    switch (format) {
      case 'jsonc': {
        const errors: ParseError[] = [];
        const result = parseJsonc(content, errors, {
          allowTrailingComma: true,
          disallowComments: false,
          allowEmptyContent: true,
        });

        if (errors.length > 0) {
          const errorMessages = errors
            .map((e) => `Line ${e.offset}: ${e.error}`)
            .join(', ');
          throw new Error(`JSONC parse errors: ${errorMessages}`);
        }

        return result as RulesetConfig;
      }

      case 'toml': {
        const result = parseToml(content);
        return result as RulesetConfig;
      }

      default:
        throw new Error(`Unsupported configuration format: ${format}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to parse ${format.toUpperCase()} config file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Deep merge configuration objects with proper precedence
 * Later configs override earlier ones
 */
export function mergeConfigs(
  ...configs: (RulesetConfig | undefined)[]
): RulesetConfig {
  const result: RulesetConfig = {};

  for (const config of configs) {
    if (!config) continue;

    // Merge scalar values
    if (config.strict !== undefined) result.strict = config.strict;
    if (config.outputDirectory !== undefined)
      result.outputDirectory = config.outputDirectory;
    if (config.defaultProviders !== undefined)
      result.defaultProviders = [...config.defaultProviders];

    // Deep merge providers
    if (config.providers) {
      result.providers = { ...result.providers };
      for (const [providerId, providerConfig] of Object.entries(
        config.providers
      )) {
        result.providers[providerId] = {
          ...result.providers[providerId],
          ...providerConfig,
          // Deep merge options
          options: {
            ...result.providers[providerId]?.options,
            ...providerConfig.options,
          },
        };
      }
    }

    // Deep merge gitignore config
    if (config.gitignore) {
      result.gitignore = {
        ...result.gitignore,
        ...config.gitignore,
        // Merge arrays properly
        keep: config.gitignore.keep
          ? [...(result.gitignore?.keep || []), ...config.gitignore.keep]
          : result.gitignore?.keep,
        ignore: config.gitignore.ignore
          ? [...(result.gitignore?.ignore || []), ...config.gitignore.ignore]
          : result.gitignore?.ignore,
        // Deep merge options
        options: {
          ...result.gitignore?.options,
          ...config.gitignore.options,
        },
      };
    }

    // Deep merge global options
    if (config.options) {
      result.options = {
        ...result.options,
        ...config.options,
      };
    }
  }

  return result;
}

/**
 * Apply environment variable overrides to configuration
 */
export function applyEnvOverrides(
  config: RulesetConfig,
  env: Record<string, string>,
  prefix = 'RULESETS'
): { config: RulesetConfig; applied: Record<string, unknown> } {
  const result = JSON.parse(JSON.stringify(config)) as RulesetConfig; // Deep clone
  const applied: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(`${prefix}_`)) continue;

    try {
      const override = parseEnvOverride(key, value, prefix);
      if (override) {
        setDeepValue(result, override.path, override.value);
        applied[key] = override.value;
      }
    } catch (error) {
      logger.warn(
        { key, value, error },
        'Failed to apply environment override'
      );
    }
  }

  return { config: result, applied };
}

/**
 * Parse a single environment variable override
 */
export function parseEnvOverride(
  key: string,
  value: string,
  prefix = 'RULESETS'
): { path: string[]; value: unknown } | null {
  if (!key.startsWith(`${prefix}_`)) return null;

  const keyParts = key
    .substring(prefix.length + 1)
    .toLowerCase()
    .split('_');

  // Convert to config path
  const path: string[] = [];
  for (let i = 0; i < keyParts.length; i++) {
    const part = keyParts[i];

    // Handle special cases
    if (part === 'providers' && i + 1 < keyParts.length) {
      path.push('providers');

      // Handle multi-word provider names like CLAUDE_CODE -> claude-code
      const providerParts = [];
      let j = i + 1;

      // Collect provider name parts until we hit a known setting
      while (j < keyParts.length) {
        const nextPart = keyParts[j];
        if (nextPart === 'enabled') {
          break;
        }
        if (
          nextPart === 'output' &&
          j + 1 < keyParts.length &&
          keyParts[j + 1] === 'path'
        ) {
          break;
        }
        providerParts.push(nextPart);
        j++;
      }

      // Join provider parts with hyphens
      const providerName = providerParts.join('-');
      path.push(providerName);

      // Handle OUTPUT_PATH -> outputPath
      if (
        j < keyParts.length &&
        keyParts[j] === 'output' &&
        j + 1 < keyParts.length &&
        keyParts[j + 1] === 'path'
      ) {
        path.push('outputPath');
        i = j + 1; // Skip both 'output' and 'path'
      } else {
        // Skip the provider name parts
        i = j - 1;
      }
      continue;
    }

    // Convert OUTPUT_DIRECTORY to outputDirectory
    if (
      part === 'output' &&
      i + 1 < keyParts.length &&
      keyParts[i + 1] === 'directory'
    ) {
      path.push('outputDirectory');
      i++; // Skip 'directory' part
      continue;
    }

    path.push(part);
  }

  // Parse value based on type inference
  const parsedValue = parseEnvValue(value);

  return { path, value: parsedValue };
}

/**
 * Parse environment variable value with type inference
 */
export function parseEnvValue(value: string): unknown {
  // Boolean values
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Numeric values
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return Number.parseFloat(value);

  // JSON values (arrays, objects)
  if (
    (value.startsWith('[') && value.endsWith(']')) ||
    (value.startsWith('{') && value.endsWith('}'))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      // Fall through to string
    }
  }

  // String values
  return value;
}

/**
 * Set a deep value in an object using a path array
 */
export function setDeepValue(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown
): void {
  let current = obj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    if (
      !(key in current) ||
      typeof current[key] !== 'object' ||
      current[key] === null
    ) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  current[path[path.length - 1]] = value;
}

/**
 * Get global configuration directory
 */
export function getGlobalConfigDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    throw new Error('Cannot determine home directory for global config');
  }

  // Use XDG Base Directory specification on Unix-like systems
  if (process.platform !== 'win32') {
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    if (xdgConfigHome) {
      return join(xdgConfigHome, 'rulesets');
    }
    return join(homeDir, '.config', 'rulesets');
  }

  // Use AppData on Windows
  const appData = process.env.APPDATA;
  if (appData) {
    return join(appData, 'rulesets');
  }

  // Fallback
  return join(homeDir, '.rulesets');
}

/**
 * Normalize path separators for cross-platform compatibility
 */
export function normalizePath(path: string): string {
  return path.replace(/[/\\]/g, '/');
}

/**
 * Validate configuration file format
 */
export function validateConfigFileName(fileName: string): boolean {
  return CONFIG_FILE_NAMES.includes(
    fileName as (typeof CONFIG_FILE_NAMES)[number]
  );
}
