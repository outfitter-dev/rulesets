import { BasePlugin } from './base-plugin';

export class WindsurfPlugin extends BasePlugin {
  id = 'windsurf';
  name = 'Windsurf';
  description = 'Generate rules for Windsurf AI editor (.windsurf/rules/)';
  
  getPaths(scope: 'global' | 'project'): string[] {
    if (scope === 'project') {
      return ['.windsurf/rules/ruleset.md'];
    }
    
    // Windsurf doesn't typically use global rules
    return [];
  }
  
  protected formatContent(content: string): string {
    // Windsurf uses plain markdown
    return content;
  }
}