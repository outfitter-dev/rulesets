import { BasePlugin } from './base-plugin';

export class CopilotPlugin extends BasePlugin {
  id = 'copilot';
  name = 'GitHub Copilot';
  description = 'Generate rules for GitHub Copilot (.github/copilot/instructions.md)';
  
  getPaths(scope: 'global' | 'project'): string[] {
    if (scope === 'project') {
      return ['.github/copilot/instructions.md'];
    }
    
    // Copilot doesn't use global rules
    return [];
  }
  
  protected formatContent(content: string): string {
    // Copilot uses plain markdown
    return content;
  }
}