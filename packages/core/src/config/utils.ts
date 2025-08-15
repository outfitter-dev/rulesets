/**
 * Configuration utilities for file discovery, parsing, and merging
 * Supports both JSONC and TOML formats with robust error handling
 */

import { dirname, join, resolve } from 'node:path';
import { parse as parseToml } from '@iarna/toml';
import { type ParseError, parse as parseJsonc } from 'jsonc-parser';
import { getChildLogger } from '../utils/logger';
import type {
  ConfigFileResult,
  ConfigLoadOptions,
  RulesetConfig,
} from './types';
import {
  createConfigFilePath,
  createConfigDirectoryPath,
} from './types';
import { CONFIG_FILE_NAMES, DEFAULT_LOAD_OPTIONS } from './types';

const logger = getChildLogger('config');

// Top-level regex patterns for better performance
const INTEGER_PATTERN = /^-?\d+$/;
const FLOAT_PATTERN = /^-?\d*\.\d+$/;

/**
 * Check if a file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    return await Bun.file(filePath).exists();
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
    const filePaths = CONFIG_FILE_NAMES.map((fileName) =>
      join(currentPath, fileName)
    );
    // biome-ignore lint/nursery/noAwaitInLoop: Sequential directory search is intentional
    const existenceResults = await Promise.all(filePaths.map(fileExists));

    // Read all existing files in parallel
    const readPromises = filePaths.map(async (filePath, i) => {
      if (!existenceResults[i]) {
        return null;
      }

      try {
        const content = await Bun.file(filePath).text();
        const fileName = CONFIG_FILE_NAMES[i];
        const format = getConfigFormat(fileName);

        return {
          filePath: createConfigFilePath(filePath),
          format,
          content,
          directory: createConfigDirectoryPath(currentPath),
          index: i, // Keep track of precedence order
        };
      } catch (error) {
        logger.warn({ filePath, error }, 'Failed to read config file');
        return null;
      }
    });

    const readResults = await Promise.all(readPromises);

    // Return the first successful read result in order of precedence
    for (const readResult of readResults) {
      if (readResult !== null) {
        const { index: _, ...result } = readResult;
        return result;
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
 * Find ALL configuration files in hierarchy starting from a directory
 * Returns configs from root to leaf (parent configs first)
 */
export async function findConfigFilesHierarchy(
  startPath: string,
  options: ConfigLoadOptions = DEFAULT_LOAD_OPTIONS
): Promise<ConfigFileResult[]> {
  const { maxSearchDepth = 10, searchParents = true } = options;
  const foundConfigs: ConfigFileResult[] = [];

  let currentPath = resolve(startPath);
  let depth = 0;

  while (depth <= maxSearchDepth) {
    // Try each config file name in order of precedence
    const filePaths = CONFIG_FILE_NAMES.map((fileName) =>
      join(currentPath, fileName)
    );
    // biome-ignore lint/nursery/noAwaitInLoop: Sequential directory search is intentional
    const existenceResults = await Promise.all(filePaths.map(fileExists));

    // Read all existing files in parallel
    const readPromises = filePaths.map(async (filePath, i) => {
      if (!existenceResults[i]) {
        return null;
      }

      try {
        const content = await Bun.file(filePath).text();
        const fileName = CONFIG_FILE_NAMES[i];
        const format = getConfigFormat(fileName);

        return {
          filePath: createConfigFilePath(filePath),
          format,
          content,
          directory: createConfigDirectoryPath(currentPath),
          index: i, // Keep track of precedence order
        };
      } catch (error) {
        logger.warn({ filePath, error }, 'Failed to read config file');
        return null;
      }
    });

    const readResults = await Promise.all(readPromises);

    // Add the first successful read result in order of precedence
    for (const readResult of readResults) {
      if (readResult !== null) {
        const { index: _, ...result } = readResult;
        foundConfigs.push(result);
        break; // Only take one config per directory
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

  // Return configs from root to leaf (parent configs first)
  return foundConfigs.reverse();
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
export function parseConfigContent(
  content: string,
  format: 'jsonc' | 'toml',
  filePath: string
): RulesetConfig {
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
            .map((e) => `Line ${e.line ?? e.offset}: ${e.error}`)
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
 * Merge scalar configuration values
 */
function mergeScalarValues(result: RulesetConfig, config: RulesetConfig): void {
  if (config.strict !== undefined) {
    result.strict = config.strict;
  }
  if (config.outputDirectory !== undefined) {
    result.outputDirectory = config.outputDirectory;
  }
  if (config.defaultProviders !== undefined) {
    result.defaultProviders = [...config.defaultProviders];
  }
}

/**
 * Merge provider configurations with deep option merging
 */
function mergeProviders(result: RulesetConfig, config: RulesetConfig): void {
  if (!config.providers) {
    return;
  }

  result.providers = { ...result.providers };

  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    result.providers[providerId] = {
      ...result.providers[providerId],
      ...providerConfig,
      options: {
        ...result.providers[providerId]?.options,
        ...providerConfig.options,
      },
    };
  }
}

/**
 * Merge gitignore configurations with array concatenation
 */
function mergeGitignore(result: RulesetConfig, config: RulesetConfig): void {
  if (!config.gitignore) {
    return;
  }

  result.gitignore = {
    ...result.gitignore,
    ...config.gitignore,
    keep: config.gitignore.keep
      ? [...(result.gitignore?.keep || []), ...config.gitignore.keep]
      : result.gitignore?.keep,
    ignore: config.gitignore.ignore
      ? [...(result.gitignore?.ignore || []), ...config.gitignore.ignore]
      : result.gitignore?.ignore,
    options: {
      ...result.gitignore?.options,
      ...config.gitignore.options,
    },
  };
}

/**
 * Merge global options
 */
function mergeGlobalOptions(
  result: RulesetConfig,
  config: RulesetConfig
): void {
  if (!config.options) {
    return;
  }

  result.options = {
    ...result.options,
    ...config.options,
  };
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
    if (!config) {
      continue;
    }

    mergeScalarValues(result, config);
    mergeProviders(result, config);
    mergeGitignore(result, config);
    mergeGlobalOptions(result, config);
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
    if (!key.startsWith(`${prefix}_`)) {
      continue;
    }

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
 * Extract provider name from key parts starting at given index
 */
function extractProviderName(
  keyParts: string[],
  startIndex: number
): { providerName: string; endIndex: number } {
  const providerParts: string[] = [];
  let j = startIndex;

  // Collect provider name parts until we hit a known setting
  while (j < keyParts.length) {
    const nextPart = keyParts[j];

    // Check for known provider settings that indicate end of provider name
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

  return {
    providerName: providerParts.join('-'),
    endIndex: j,
  };
}

/**
 * Handle provider-specific path parsing
 */
function parseProviderPath(
  keyParts: string[],
  index: number,
  path: string[]
): number {
  path.push('providers');

  const { providerName, endIndex } = extractProviderName(keyParts, index + 1);
  path.push(providerName);

  // Check for OUTPUT_PATH -> outputPath conversion
  if (
    endIndex < keyParts.length &&
    keyParts[endIndex] === 'output' &&
    endIndex + 1 < keyParts.length &&
    keyParts[endIndex + 1] === 'path'
  ) {
    path.push('outputPath');
    return endIndex + 1; // Skip both 'output' and 'path'
  }

  return endIndex - 1; // Position for next iteration
}

/**
 * Handle output directory path parsing
 */
function parseOutputDirectory(
  keyParts: string[],
  index: number,
  path: string[]
): number {
  if (index + 1 < keyParts.length && keyParts[index + 1] === 'directory') {
    path.push('outputDirectory');
    return index + 1; // Skip 'directory' part
  }
  return index;
}

/**
 * Convert environment variable key to configuration path
 */
function buildConfigPath(keyParts: string[]): string[] {
  const path: string[] = [];

  for (let i = 0; i < keyParts.length; i++) {
    const part = keyParts[i];

    // Handle provider paths
    if (part === 'providers' && i + 1 < keyParts.length) {
      i = parseProviderPath(keyParts, i, path);
      continue;
    }

    // Handle output directory
    if (part === 'output') {
      const newIndex = parseOutputDirectory(keyParts, i, path);
      if (newIndex !== i) {
        i = newIndex;
        continue;
      }
    }

    path.push(part);
  }

  return path;
}

/**
 * Parse a single environment variable override
 */
export function parseEnvOverride(
  key: string,
  value: string,
  prefix = 'RULESETS'
): { path: string[]; value: unknown } | null {
  if (!key.startsWith(`${prefix}_`)) {
    return null;
  }

  const keyParts = key
    .substring(prefix.length + 1)
    .toLowerCase()
    .split('_');

  const path = buildConfigPath(keyParts);
  const parsedValue = parseEnvValue(value);

  return { path, value: parsedValue };
}

/**
 * Parse environment variable value with type inference
 */
export function parseEnvValue(value: string): unknown {
  // Boolean values
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  // Numeric values
  if (INTEGER_PATTERN.test(value)) {
    return Number.parseInt(value, 10);
  }
  if (FLOAT_PATTERN.test(value)) {
    return Number.parseFloat(value);
  }

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

  const lastKey = path.at(-1);
  if (lastKey !== undefined) {
    current[lastKey] = value;
  }
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
