import type { DestinationPlugin } from '../interfaces';
import { AgentsMdPlugin } from './agents-md-plugin';
import { ClaudeCodePlugin } from './claude-code-plugin';
import { ClinePlugin } from './cline-plugin';
import { CodexPlugin } from './codex-plugin';
import { CursorPlugin } from './cursor-plugin';
import { GitHubCopilotPlugin } from './github-copilot-plugin';
import { RooCodePlugin } from './roo-code-plugin';
import { WindsurfPlugin } from './windsurf-plugin';
import { ZedPlugin } from './zed-plugin';

// Create singleton instances
export const agentsMdPlugin = new AgentsMdPlugin();
export const claudeCodePlugin = new ClaudeCodePlugin();
export const clinePlugin = new ClinePlugin();
export const codexPlugin = new CodexPlugin();
export const cursorPlugin = new CursorPlugin();
export const githubCopilotPlugin = new GitHubCopilotPlugin();
export const rooCodePlugin = new RooCodePlugin();
export const windsurfPlugin = new WindsurfPlugin();
export const zedPlugin = new ZedPlugin();

// Export as a map for easy lookup
// Ordered by priority based on adoption (as of December 2025)
export const destinations: ReadonlyMap<string, DestinationPlugin> = new Map([
  // Universal standard (20,000+ projects)
  ['agents-md', agentsMdPlugin],
  
  // Major AI assistants
  ['claude-code', claudeCodePlugin],       // Claude Code CLI with slash commands
  ['github-copilot', githubCopilotPlugin], // GitHub Copilot (wide enterprise adoption)
  
  // Popular IDE integrations  
  ['cursor', cursorPlugin],     // Cursor IDE (migrating to .cursor/rules/)
  ['windsurf', windsurfPlugin], // Windsurf IDE (6k char limits)
  
  // VSCode extensions
  ['cline', clinePlugin],       // Cline (file-based system)
  ['roo-code', rooCodePlugin],  // Roo Code/Codeium (supports AGENTS.md)
  
  // Other tools
  ['codex', codexPlugin],       // OpenAI Codex CLI (April 2025)
  ['codex-cli', codexPlugin],   // Alias for backward compatibility
  ['zed', zedPlugin],           // Zed Editor (single .rules file)
]);

// Re-export classes for testing and extension
// biome-ignore lint/performance/noBarrelFile: Destination plugin exports
export { AgentsMdPlugin } from './agents-md-plugin';
export { ClaudeCodePlugin } from './claude-code-plugin';
export { ClinePlugin } from './cline-plugin';
export { CodexPlugin } from './codex-plugin';
export { CursorPlugin } from './cursor-plugin';
export { GitHubCopilotPlugin } from './github-copilot-plugin';
export { RooCodePlugin } from './roo-code-plugin';
export { WindsurfPlugin } from './windsurf-plugin';
export { ZedPlugin } from './zed-plugin';
