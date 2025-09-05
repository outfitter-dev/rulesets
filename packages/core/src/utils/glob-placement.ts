import { minimatch } from 'minimatch';
import path from 'node:path';

/**
 * Glob-based file placement with Lowest Common Denominator (LCD) logic.
 * Ensures files are placed at the most appropriate directory level
 * without duplicating in subdirectories.
 */
export class GlobPlacementManager {
  /**
   * Finds the lowest common denominator directory for a set of glob patterns.
   * This prevents duplicate files in nested directories.
   * 
   * @param globs - Array of glob patterns
   * @param basePath - Base path to resolve globs against
   * @returns Map of directory paths to place files
   */
  static findLCDPlacements(
    globs: string[],
    basePath = '.'
  ): Map<string, string[]> {
    const placements = new Map<string, string[]>();
    
    // Parse each glob to determine target directories
    for (const glob of globs) {
      const directories = this.extractDirectoriesFromGlob(glob, basePath);
      
      for (const dir of directories) {
        if (!placements.has(dir)) {
          placements.set(dir, []);
        }
        placements.get(dir)!.push(glob);
      }
    }
    
    // Apply LCD logic to remove redundant placements
    return this.applyLCDLogic(placements);
  }
  
  /**
   * Extracts potential directory placements from a glob pattern.
   */
  private static extractDirectoriesFromGlob(
    glob: string,
    basePath: string
  ): string[] {
    const directories: string[] = [];
    
    // Handle different glob patterns
    if (glob.includes('**')) {
      // For recursive patterns, find the base directory
      const parts = glob.split('**');
      const baseDir = path.join(basePath, parts[0]);
      directories.push(path.normalize(baseDir));
      
      // Also consider specific subdirectories if pattern is more specific
      if (parts[1] && parts[1].includes('/')) {
        const subDirs = parts[1].split('/').filter(Boolean);
        if (subDirs.length > 0 && !subDirs[0].includes('*')) {
          directories.push(path.join(baseDir, subDirs[0]));
        }
      }
    } else if (glob.includes('*')) {
      // For single-level wildcards, use the parent directory
      const dir = path.dirname(glob);
      directories.push(path.join(basePath, dir));
    } else {
      // For specific paths, use as-is
      directories.push(path.join(basePath, glob));
    }
    
    return directories.map(d => path.normalize(d));
  }
  
  /**
   * Applies LCD logic to remove redundant nested placements.
   * If a parent directory is included, child directories are removed.
   */
  private static applyLCDLogic(
    placements: Map<string, string[]>
  ): Map<string, string[]> {
    const directories = Array.from(placements.keys()).sort();
    const toRemove = new Set<string>();
    
    for (let i = 0; i < directories.length; i++) {
      for (let j = i + 1; j < directories.length; j++) {
        // Check if directories[j] is a subdirectory of directories[i]
        const relative = path.relative(directories[i], directories[j]);
        if (!relative.startsWith('..') && relative !== '') {
          // directories[j] is a subdirectory of directories[i]
          toRemove.add(directories[j]);
        }
      }
    }
    
    // Remove redundant directories
    for (const dir of toRemove) {
      placements.delete(dir);
    }
    
    return placements;
  }
  
  /**
   * Determines if a file path matches any of the provided glob patterns.
   */
  static matchesGlobs(filePath: string, globs: string[]): boolean {
    const normalizedPath = path.normalize(filePath);
    return globs.some(glob => minimatch(normalizedPath, glob));
  }
  
  /**
   * Gets the appropriate placement directory for a specific file type
   * based on configuration and glob patterns.
   */
  static getPlacementForFile(
    fileName: string,
    globs: string[],
    basePath = '.'
  ): string | null {
    const placements = this.findLCDPlacements(globs, basePath);
    
    // Return the first matching placement
    for (const [dir] of placements) {
      // Check if this directory is appropriate for the file
      const testPath = path.join(dir, fileName);
      if (globs.some(glob => minimatch(testPath, glob))) {
        return dir;
      }
    }
    
    // Default to base path if no specific placement found
    return placements.size > 0 ? Array.from(placements.keys())[0] : basePath;
  }
}