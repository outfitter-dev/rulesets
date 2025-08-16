/**
 * Migration utilities for converting v0.1 Rulesets to v0.2 Handlebars syntax
 * Part of Phase 4: Integration and Migration
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import type { Logger } from '@rulesets/types';
import { ConsoleLogger } from './logger';

export interface MigrationOptions {
  /**
   * Source file or directory to migrate
   */
  input: string;
  
  /**
   * Output directory for migrated files
   * If not specified, files are migrated in place
   */
  output?: string;
  
  /**
   * Dry run mode - show changes without writing files
   */
  dryRun?: boolean;
  
  /**
   * Backup original files before migration
   */
  backup?: boolean;
  
  /**
   * Logger for migration progress
   */
  logger?: Logger;
}

export interface MigrationResult {
  /**
   * Number of files processed
   */
  filesProcessed: number;
  
  /**
   * Number of files that were actually changed
   */
  filesChanged: number;
  
  /**
   * List of transformations applied
   */
  transformations: Array<{
    file: string;
    changes: Array<{
      line: number;
      original: string;
      transformed: string;
      pattern: string;
    }>;
  }>;
  
  /**
   * Any errors encountered during migration
   */
  errors: Array<{
    file: string;
    error: string;
  }>;
}

/**
 * Migration patterns for transforming v0.1 to v0.2 syntax
 */
const MIGRATION_PATTERNS = [
  {
    name: 'Variable syntax',
    pattern: /\{\{\$([^}]+)\}\}/g,
    replacement: '{{$1}}',
    description: 'Transform {{$var}} to {{var}}'
  },
  {
    name: 'Block opening tags',
    pattern: /\{\{([a-zA-Z][a-zA-Z0-9-_]*)\s*([^}]*)\}\}/g,
    replacement: (match: string, blockName: string, attributes: string) => {
      // Don't transform if it's already a handlebars helper (starts with #, /, etc.)
      if (blockName.startsWith('#') || blockName.startsWith('/') || blockName.startsWith('!')) {
        return match;
      }
      
      // Don't transform if it's a variable reference (no spaces or attributes)
      if (!attributes.trim()) {
        return match;
      }
      
      // Transform provider filters to hash syntax
      const transformedAttributes = attributes
        .replace(/\+([a-zA-Z-]+)/g, 'include="$1"')
        .replace(/\-([a-zA-Z-]+)/g, 'exclude="$1"')
        .replace(/\s+/g, ' ')
        .trim();
      
      return `{{#${blockName}${transformedAttributes ? ' ' + transformedAttributes : ''}}}`;
    },
    description: 'Transform {{block}} to {{#block}} with attribute conversion'
  },
  {
    name: 'Block closing tags',
    pattern: /\{\{\/([a-zA-Z][a-zA-Z0-9-_]*)\}\}/g,
    replacement: '{{/$1}}',
    description: 'Ensure proper closing tag format'
  },
  {
    name: 'Partial imports',
    pattern: /\{\{\>\s*([^@][^}]+)\}\}/g,
    replacement: '{{> @$1}}',
    description: 'Transform {{> partial}} to {{> @partial}} for _partials directory'
  }
];

/**
 * Migrate a single file from v0.1 to v0.2 syntax
 */
export function migrateFile(
  filePath: string, 
  content: string, 
  options: Partial<MigrationOptions> = {}
): { transformed: string; changes: MigrationResult['transformations'][0]['changes'] } {
  const logger = options.logger || new ConsoleLogger();
  let transformed = content;
  const changes: MigrationResult['transformations'][0]['changes'] = [];
  
  // Split content into lines for line-by-line tracking
  const lines = content.split('\n');
  const transformedLines = [...lines];
  
  for (const pattern of MIGRATION_PATTERNS) {
    if (typeof pattern.replacement === 'string') {
      // Simple string replacement
      for (let i = 0; i < transformedLines.length; i++) {
        const line = transformedLines[i];
        const matches = line.match(pattern.pattern);
        
        if (matches) {
          const newLine = line.replace(pattern.pattern, pattern.replacement);
          if (newLine !== line) {
            changes.push({
              line: i + 1,
              original: line,
              transformed: newLine,
              pattern: pattern.name,
            });
            transformedLines[i] = newLine;
          }
        }
      }
    } else {
      // Function replacement
      for (let i = 0; i < transformedLines.length; i++) {
        const line = transformedLines[i];
        let newLine = line;
        
        line.replace(pattern.pattern, (...args) => {
          const match = args[0];
          const replacement = pattern.replacement(match, ...args.slice(1, -2));
          newLine = newLine.replace(match, replacement);
          return replacement;
        });
        
        if (newLine !== line) {
          changes.push({
            line: i + 1,
            original: line,
            transformed: newLine,
            pattern: pattern.name,
          });
          transformedLines[i] = newLine;
        }
      }
    }
  }
  
  transformed = transformedLines.join('\n');
  
  if (changes.length > 0) {
    logger.debug(`Applied ${changes.length} transformations to ${filePath}`);
  }
  
  return { transformed, changes };
}

/**
 * Migrate files from v0.1 to v0.2 Handlebars syntax
 */
export async function migrateRulesets(options: MigrationOptions): Promise<MigrationResult> {
  const logger = options.logger || new ConsoleLogger();
  const result: MigrationResult = {
    filesProcessed: 0,
    filesChanged: 0,
    transformations: [],
    errors: [],
  };
  
  const inputPath = resolve(options.input);
  
  if (!existsSync(inputPath)) {
    throw new Error(`Input path does not exist: ${inputPath}`);
  }
  
  try {
    const files = await discoverRulesetFiles(inputPath);
    logger.info(`Found ${files.length} ruleset files to process`);
    
    for (const file of files) {
      try {
        logger.debug(`Processing: ${file}`);
        
        const content = readFileSync(file, 'utf-8');
        const { transformed, changes } = migrateFile(file, content, options);
        
        result.filesProcessed++;
        
        if (changes.length > 0) {
          result.filesChanged++;
          result.transformations.push({
            file,
            changes,
          });
          
          if (!options.dryRun) {
            // Determine output path
            const outputPath = options.output 
              ? join(options.output, file.replace(inputPath, ''))
              : file;
            
            // Create backup if requested
            if (options.backup && outputPath === file) {
              const backupPath = `${file}.bak.${Date.now()}`;
              writeFileSync(backupPath, content);
              logger.debug(`Created backup: ${backupPath}`);
            }
            
            // Ensure output directory exists
            mkdirSync(dirname(outputPath), { recursive: true });
            
            // Write transformed content
            writeFileSync(outputPath, transformed);
            logger.info(`Migrated: ${file} → ${outputPath}`);
          } else {
            logger.info(`Would migrate: ${file} (${changes.length} changes)`);
          }
        } else {
          logger.debug(`No changes needed: ${file}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({ file, error: errorMessage });
        logger.error(`Error processing ${file}: ${errorMessage}`);
      }
    }
    
    // Summary
    logger.info(`Migration ${options.dryRun ? 'analysis' : 'completed'}:`);
    logger.info(`  Files processed: ${result.filesProcessed}`);
    logger.info(`  Files changed: ${result.filesChanged}`);
    logger.info(`  Total transformations: ${result.transformations.reduce((acc, t) => acc + t.changes.length, 0)}`);
    
    if (result.errors.length > 0) {
      logger.warn(`  Errors: ${result.errors.length}`);
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
  
  return result;
}

/**
 * Discover all ruleset files in a path
 */
async function discoverRulesetFiles(path: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!existsSync(path)) {
    return files;
  }
  
  const stat = await import('node:fs/promises').then(fs => fs.stat(path));
  
  if (stat.isFile()) {
    if (isRulesetFile(path)) {
      files.push(path);
    }
  } else if (stat.isDirectory()) {
    const fs = await import('node:fs/promises');
    const entries = await fs.readdir(path, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(path, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        // Recursively search subdirectories
        const subFiles = await discoverRulesetFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && isRulesetFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  
  return files.sort();
}

/**
 * Check if a file is a ruleset file
 */
function isRulesetFile(filePath: string): boolean {
  const ext = extname(filePath);
  const validExtensions = ['.md', '.rule.md'];
  return validExtensions.includes(ext) || filePath.includes('.rule.');
}

/**
 * Preview migration changes without applying them
 */
export async function previewMigration(options: MigrationOptions): Promise<MigrationResult> {
  return migrateRulesets({
    ...options,
    dryRun: true,
  });
}