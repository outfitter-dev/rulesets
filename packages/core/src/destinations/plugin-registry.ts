import type { DestinationPlugin } from './base-plugin';
import { ClaudeCodePlugin } from './claude-code-plugin';
import { CursorPlugin } from './cursor-plugin';
import { WindsurfPlugin } from './windsurf-plugin';
import { CopilotPlugin } from './copilot-plugin';
import { AgentsMdPlugin } from './agents-md-plugin';

export class PluginRegistry {
  private plugins: Map<string, DestinationPlugin>;
  
  constructor() {
    this.plugins = new Map();
    this.registerDefaultPlugins();
  }
  
  private registerDefaultPlugins(): void {
    // Register all built-in plugins
    this.register(new ClaudeCodePlugin());
    this.register(new CursorPlugin());
    this.register(new WindsurfPlugin());
    this.register(new CopilotPlugin());
    this.register(new AgentsMdPlugin());
    
    // Future plugins can be added here:
    // - ClinePlugin
    // - RooCodePlugin
    // - ZedPlugin
  }
  
  register(plugin: DestinationPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }
  
  getPlugin(id: string): DestinationPlugin | undefined {
    return this.plugins.get(id);
  }
  
  getAllPlugins(): DestinationPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  getPluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }
}