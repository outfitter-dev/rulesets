// TLDR: Version-aware pattern matching utilities for semantic version patterns

/**
 * Generate comprehensive patterns for version matching
 */
export function generateVersionPatterns(versionInput: string): string[] {
  // Normalize input - remove v prefix and handle wildcards
  let version = versionInput.toLowerCase();
  if (version.startsWith('v')) {
    version = version.slice(1);
  }
  
  // Replace x with * for consistency
  version = version.replace(/x/g, '*');
  
  // Parse version parts
  const parts = version.split('.');
  const major = parts[0] || '*';
  const minor = parts[1] || '*';
  const patch = parts[2] || '*';
  
  // Build base version strings (with and without v prefix)
  const baseVersions = [];
  
  if (parts.length === 1) {
    // Major only: 0, v0
    baseVersions.push(major, `v${major}`);
  } else if (parts.length === 2) {
    // Major.minor: 0.1, v0.1
    const majorMinor = `${major}.${minor}`;
    baseVersions.push(majorMinor, `v${majorMinor}`);
  } else {
    // Major.minor.patch: 0.1.2, v0.1.2
    const fullVersion = `${major}.${minor}.${patch}`;
    baseVersions.push(fullVersion, `v${fullVersion}`);
  }
  
  // Generate comprehensive pattern array
  const patterns: string[] = [];
  
  for (const baseVersion of baseVersions) {
    // Direct matches with wildcards
    patterns.push(`*${baseVersion}*`);
    
    // Path-based patterns
    patterns.push(`*/${baseVersion}/*`);
    patterns.push(`*/${baseVersion}`);
    patterns.push(`${baseVersion}/*`);
    
    // Hyphen-separated patterns  
    patterns.push(`*-${baseVersion}-*`);
    patterns.push(`*-${baseVersion}`);
    patterns.push(`${baseVersion}-*`);
    
    // Underscore-separated patterns
    patterns.push(`*_${baseVersion}_*`);
    patterns.push(`*_${baseVersion}`);
    patterns.push(`${baseVersion}_*`);
  }
  
  // Remove duplicates while preserving order
  return [...new Set(patterns)];
}

/**
 * Create version-aware branch filter
 */
export function createVersionFilter(versionInput: string): (branches: string[]) => string[] {
  const patterns = generateVersionPatterns(versionInput);
  
  return (branches: string[]) => {
    const matches = new Set<string>();
    
    for (const pattern of patterns) {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
      
      const regex = new RegExp(`^${regexPattern}$`);
      
      branches.forEach(branch => {
        if (regex.test(branch)) {
          matches.add(branch);
        }
      });
    }
    
    return Array.from(matches);
  };
}