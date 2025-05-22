// TLDR: Branch pattern matching utilities for filtering branches with include/exclude syntax

import { BranchDiffsConfig } from './config';

/**
 * Check if a branch name matches a pattern with glob-style wildcards
 */
function matchesPattern(branchName: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')  // * becomes .*
    .replace(/\?/g, '.')   // ? becomes .
    .replace(/\[/g, '\\[') // escape literal brackets
    .replace(/\]/g, '\\]');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(branchName);
}

/**
 * Apply pattern-based filtering to a list of branches
 */
export function applyPatterns(branches: string[], patterns: string[]): string[] {
  let result = new Set<string>();
  let excluded = new Set<string>();
  
  // Process patterns in order
  for (const pattern of patterns) {
    if (pattern.startsWith('!')) {
      // Exclusion pattern - remove from result and add to excluded set
      const excludePattern = pattern.slice(1);
      branches.forEach(branch => {
        if (matchesPattern(branch, excludePattern)) {
          result.delete(branch);
          excluded.add(branch);
        }
      });
    } else if (pattern.startsWith('+')) {
      // Force inclusion pattern - add even if previously excluded
      const includePattern = pattern.slice(1);
      branches.forEach(branch => {
        if (matchesPattern(branch, includePattern)) {
          result.add(branch);
          excluded.delete(branch);
        }
      });
    } else {
      // Regular inclusion pattern - add if not excluded
      branches.forEach(branch => {
        if (matchesPattern(branch, pattern) && !excluded.has(branch)) {
          result.add(branch);
        }
      });
    }
  }
  
  return Array.from(result);
}

/**
 * Get branches using a named pattern from config
 */
export function getBranchesWithPattern(
  allBranches: string[],
  patternName: string,
  config: BranchDiffsConfig
): string[] {
  const { branch } = config.git;
  
  // Check if pattern exists
  if (!branch.patterns[patternName]) {
    throw new Error(`Pattern "${patternName}" not found in configuration`);
  }
  
  // Start with all branches
  let result = [...allBranches];
  
  // Apply global exclusions first
  if (branch.exclude.length > 0) {
    result = result.filter(branchName => {
      return !branch.exclude.some(pattern => matchesPattern(branchName, pattern));
    });
  }
  
  // Apply pattern-specific filtering
  const patternRules = branch.patterns[patternName];
  result = applyPatterns(result, patternRules);
  
  // Apply global inclusions (force include even if excluded)
  if (branch.include.length > 0) {
    const forceIncluded = allBranches.filter(branchName => {
      return branch.include.some(pattern => matchesPattern(branchName, pattern));
    });
    
    // Add force-included branches that aren't already in result
    forceIncluded.forEach(branch => {
      if (!result.includes(branch)) {
        result.push(branch);
      }
    });
  }
  
  return result;
}

/**
 * List all available pattern names from config
 */
export function listPatterns(config: BranchDiffsConfig): string[] {
  return Object.keys(config.git.branch.patterns);
}