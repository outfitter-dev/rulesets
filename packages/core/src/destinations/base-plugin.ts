import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { ComposedRuleset } from '../rulesets/ruleset-manager';

export interface DestinationPlugin {
  id: string;
  name: string;
  description: string;
  
  getPaths(scope: 'global' | 'project'): string[];
  generate(rulesets: ComposedRuleset[]): Promise<string>;
  write(content: string, scope: 'global' | 'project'): Promise<void>;
}

export abstract class BasePlugin implements DestinationPlugin {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  
  abstract getPaths(scope: 'global' | 'project'): string[];
  
  /**
   * Format the content for this specific destination.
   * Override this to add destination-specific formatting.
   */
  protected formatContent(content: string): string {
    return content;
  }
  
  /**
   * Generate content from composed rulesets.
   */
  async generate(rulesets: ComposedRuleset[]): Promise<string> {
    if (rulesets.length === 0) {
      return '';
    }
    
    // Combine all ruleset rules
    const sections: string[] = [];
    
    for (const ruleset of rulesets) {
      sections.push(ruleset.rules);
    }
    
    const combined = sections.join('\n\n---\n\n');
    return this.formatContent(combined);
  }
  
  /**
   * Write content to the destination paths.
   */
  async write(content: string, scope: 'global' | 'project'): Promise<void> {
    const paths = this.getPaths(scope);
    
    for (const relativePath of paths) {
      const fullPath = this.resolvePath(relativePath, scope);
      const dir = dirname(fullPath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true });
      
      // Write the content
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }
  
  /**
   * Resolve a relative path to an absolute path based on scope.
   */
  protected resolvePath(relativePath: string, scope: 'global' | 'project'): string {
    if (scope === 'project') {
      return join(process.cwd(), relativePath);
    }
    
    // For global scope, use home directory
    return join(homedir(), relativePath);
  }
  
  /**
   * Get platform-specific configuration directory.
   */
  protected getConfigDir(): string {
    const platform = process.platform;
    const home = homedir();
    
    switch (platform) {
      case 'darwin':
        return join(home, 'Library', 'Application Support');
      case 'win32':
        return process.env.APPDATA || join(home, 'AppData', 'Roaming');
      default:
        // Linux and others
        return process.env.XDG_CONFIG_HOME || join(home, '.config');
    }
  }
}