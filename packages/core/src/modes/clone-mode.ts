import { promises as fs } from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import type { Logger } from '../interfaces';

/**
 * Clone mode for simple AGENTS.md <-> CLAUDE.md synchronization.
 * Auto-detects source format and clones to the other.
 */
export class CloneMode {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Performs clone operation from source to target format.
   * Auto-detects which format to use based on existing files.
   */
  async execute(options: {
    rootPath?: string;
    recursive?: boolean;
    dryRun?: boolean;
  } = {}): Promise<CloneResult> {
    const { 
      rootPath = '.', 
      recursive = true,
      dryRun = false 
    } = options;
    
    this.logger.info('Starting clone mode operation...');
    
    // Detect existing files
    const detection = await this.detectExistingFiles(rootPath, recursive);
    
    // Determine clone direction
    const direction = this.determineCloneDirection(detection);
    
    if (!direction) {
      this.logger.warn('No AGENTS.md or CLAUDE.md files found. Nothing to clone.');
      return {
        success: true,
        filesCloned: 0,
        source: 'none',
        target: 'none',
        files: []
      };
    }
    
    // Perform cloning
    const result = await this.performCloning({
      rootPath,
      source: direction.source,
      target: direction.target,
      files: direction.files,
      dryRun
    });
    
    this.logger.info(`Clone operation completed. ${result.filesCloned} files ${dryRun ? 'would be' : ''} cloned.`);
    return result;
  }
  
  /**
   * Detects existing AGENTS.md and CLAUDE.md files.
   */
  private async detectExistingFiles(
    rootPath: string,
    recursive: boolean
  ): Promise<FileDetection> {
    const pattern = recursive 
      ? '**/{AGENTS,CLAUDE}.md'
      : '{AGENTS,CLAUDE}.md';
    
    const files = await glob(pattern, {
      cwd: rootPath,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    });
    
    const agentsFiles: string[] = [];
    const claudeFiles: string[] = [];
    
    for (const file of files) {
      if (file.endsWith('AGENTS.md')) {
        agentsFiles.push(file);
      } else if (file.endsWith('CLAUDE.md')) {
        claudeFiles.push(file);
      }
    }
    
    return { agentsFiles, claudeFiles };
  }
  
  /**
   * Determines which direction to clone based on existing files.
   * Prefers AGENTS.md as source if both exist.
   */
  private determineCloneDirection(
    detection: FileDetection
  ): CloneDirection | null {
    const { agentsFiles, claudeFiles } = detection;
    
    if (agentsFiles.length === 0 && claudeFiles.length === 0) {
      return null;
    }
    
    // If only one type exists, clone to the other
    if (agentsFiles.length > 0 && claudeFiles.length === 0) {
      return {
        source: 'AGENTS.md',
        target: 'CLAUDE.md',
        files: agentsFiles
      };
    }
    
    if (claudeFiles.length > 0 && agentsFiles.length === 0) {
      return {
        source: 'CLAUDE.md',
        target: 'AGENTS.md',
        files: claudeFiles
      };
    }
    
    // If both exist, prefer AGENTS.md as source (it's the universal standard)
    // But only clone files that don't have a corresponding target
    const agentsToClone = agentsFiles.filter(agentFile => {
      const claudePath = agentFile.replace('AGENTS.md', 'CLAUDE.md');
      return !claudeFiles.includes(claudePath);
    });
    
    if (agentsToClone.length > 0) {
      return {
        source: 'AGENTS.md',
        target: 'CLAUDE.md',
        files: agentsToClone
      };
    }
    
    // Check the reverse direction
    const claudeToClone = claudeFiles.filter(claudeFile => {
      const agentsPath = claudeFile.replace('CLAUDE.md', 'AGENTS.md');
      return !agentsFiles.includes(agentsPath);
    });
    
    if (claudeToClone.length > 0) {
      return {
        source: 'CLAUDE.md',
        target: 'AGENTS.md',
        files: claudeToClone
      };
    }
    
    // All files already have their counterparts
    this.logger.info('All files already have their counterparts. Nothing to clone.');
    return null;
  }
  
  /**
   * Performs the actual cloning of files.
   */
  private async performCloning(options: {
    rootPath: string;
    source: string;
    target: string;
    files: string[];
    dryRun: boolean;
  }): Promise<CloneResult> {
    const { rootPath, source, target, files, dryRun } = options;
    const clonedFiles: string[] = [];
    
    for (const sourceFile of files) {
      const sourcePath = path.join(rootPath, sourceFile);
      const targetFile = sourceFile.replace(source, target);
      const targetPath = path.join(rootPath, targetFile);
      
      try {
        if (dryRun) {
          this.logger.info(`[DRY RUN] Would clone: ${sourceFile} -> ${targetFile}`);
          clonedFiles.push(targetFile);
        } else {
          // Read source file
          const content = await fs.readFile(sourcePath, 'utf-8');
          
          // Ensure target directory exists
          const targetDir = path.dirname(targetPath);
          await fs.mkdir(targetDir, { recursive: true });
          
          // Write target file
          await fs.writeFile(targetPath, content, 'utf-8');
          
          this.logger.info(`Cloned: ${sourceFile} -> ${targetFile}`);
          clonedFiles.push(targetFile);
        }
      } catch (error) {
        this.logger.error(`Failed to clone ${sourceFile}:`, error);
      }
    }
    
    return {
      success: true,
      filesCloned: clonedFiles.length,
      source,
      target,
      files: clonedFiles
    };
  }
}

// Type definitions
interface FileDetection {
  agentsFiles: string[];
  claudeFiles: string[];
}

interface CloneDirection {
  source: string;
  target: string;
  files: string[];
}

export interface CloneResult {
  success: boolean;
  filesCloned: number;
  source: string;
  target: string;
  files: string[];
}