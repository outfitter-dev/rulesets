import { BasePlugin } from './base-plugin';

export class CursorPlugin extends BasePlugin {
  id = 'cursor';
  name = 'Cursor';
  description = 'Generate rules for Cursor AI editor (.cursor/rules/ and .cursorrules)';
  
  getPaths(scope: 'global' | 'project'): string[] {
    if (scope === 'project') {
      return [
        '.cursor/rules/ruleset.md',
        '.cursorrules'
      ];
    }
    
    // Cursor doesn't typically use global rules
    return [];
  }
  
  protected formatContent(content: string): string {
    // Cursor uses plain markdown
    return content;
  }
}