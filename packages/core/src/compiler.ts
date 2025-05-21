import { CompilerConfig, SourceRulesFile, SUPPORTED_EXTENSIONS } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Mixdown compiler class
 */
export class MixdownCompiler {
  private config: CompilerConfig;

  constructor(config: CompilerConfig) {
    this.config = {
      ...config,
      preferMixExtension: config.preferMixExtension ?? true // Default to preferring .mix.md
    };
  }

  /**
   * Find and load all source rules files in the source directory
   */
  findSourceRulesFiles(directory: string = this.config.srcDir): SourceRulesFile[] {
    const files: SourceRulesFile[] = [];
    
    if (!fs.existsSync(directory)) {
      return files;
    }
    
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        // Skip directories that start with an underscore (considered special)
        if (!entry.name.startsWith('_')) {
          files.push(...this.findSourceRulesFiles(fullPath));
        }
      } else if (entry.isFile()) {
        // Check if the file has a supported extension
        // Check for .mix.md first since it's more specific than .md
        if (entry.name.endsWith('.mix.md')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          files.push({
            path: fullPath,
            content,
            extension: '.mix.md'
          });
        } else if (entry.name.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          files.push({
            path: fullPath,
            content,
            extension: '.md'
          });
        }
      }
    }
    
    return files;
  }
  
  /**
   * Determines the output path for a source rules file
   * @param sourceFile The source rules file
   * @param extension Optional override extension
   */
  getOutputPath(sourceFile: SourceRulesFile, extension?: string): string {
    const relativePath = path.relative(this.config.srcDir, sourceFile.path);
    const outputPath = path.join(this.config.outDir, relativePath);
    
    if (extension) {
      return outputPath.replace(/\.[^.]+$/, extension);
    }
    
    return outputPath;
  }
  
  /**
   * Get the preferred extension for new source rules files
   */
  getPreferredExtension(): string {
    return this.config.preferMixExtension ? '.mix.md' : '.md';
  }
  
  /**
   * Determines if a file is a valid source rules file
   * @param filePath Path to check
   */
  isSourceRulesFile(filePath: string): boolean {
    return SUPPORTED_EXTENSIONS.some(ext => filePath.endsWith(ext));
  }
}

export const compiler = {
  createCompiler: (config: CompilerConfig) => new MixdownCompiler(config)
};