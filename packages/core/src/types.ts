/**
 * Mixdown compiler types
 */

/**
 * Supported file extensions for Mixdown source rules
 */
export const SUPPORTED_EXTENSIONS = ['.md', '.mix.md'] as const;
export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * Configuration for the Mixdown compiler
 */
export interface CompilerConfig {
  /**
   * Path to source rules directory
   */
  srcDir: string;
  
  /**
   * Path to output directory
   */
  outDir: string;
  
  /**
   * Whether to prefer the .mix.md extension (true) or .md extension (false)
   */
  preferMixExtension?: boolean;
}

/**
 * Represents a source rules file
 */
export interface SourceRulesFile {
  /**
   * Path to the file
   */
  path: string;
  
  /**
   * Content of the file
   */
  content: string;
  
  /**
   * Extension of the file (.md or .mix.md)
   */
  extension: SupportedExtension;
}