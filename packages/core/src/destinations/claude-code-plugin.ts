import { join } from 'node:path';
import { BasePlugin } from './base-plugin';

export class ClaudeCodePlugin extends BasePlugin {
  id = 'claude-code';
  name = 'Claude Code';
  description = 'Generate rules for Claude Code AI assistant (.claude/CLAUDE.md)';
  
  getPaths(scope: 'global' | 'project'): string[] {
    if (scope === 'project') {
      return ['.claude/CLAUDE.md'];
    }
    
    // Global paths for Claude Code
    const configDir = this.getConfigDir();
    const platform = process.platform;
    
    switch (platform) {
      case 'darwin':
        return [
          join(configDir, 'Claude', 'CLAUDE.md'),
          join(configDir, 'com.anthropic.claude', 'CLAUDE.md')
        ];
      case 'win32':
        return [
          join(configDir, 'Claude', 'CLAUDE.md'),
          join(configDir, 'Anthropic', 'Claude', 'CLAUDE.md')
        ];
      default:
        // Linux
        return [
          join('.config', 'claude', 'CLAUDE.md'),
          join('.claude', 'CLAUDE.md')
        ];
    }
  }
  
  protected formatContent(content: string): string {
    // Claude Code uses plain markdown without special markers
    return content;
  }
}