import { BasePlugin } from './base-plugin';
import type { ComposedRuleset } from '../rulesets/ruleset-manager';

export class AgentsMdPlugin extends BasePlugin {
  id = 'agents-md';
  name = 'AGENTS.md';
  description = 'Generate rules for AGENTS.md in project root';
  
  getPaths(scope: 'global' | 'project'): string[] {
    if (scope === 'project') {
      return ['AGENTS.md'];
    }
    
    // AGENTS.md is project-specific
    return [];
  }
  
  async generate(rulesets: ComposedRuleset[]): Promise<string> {
    if (rulesets.length === 0) {
      return '';
    }
    
    // Start with header
    const sections: string[] = ['# Agent Instructions\n'];
    
    // Add each ruleset as a section
    for (const ruleset of rulesets) {
      const sectionName = this.formatSectionName(ruleset.name);
      sections.push(`## ${sectionName}\n\n${ruleset.rules}`);
    }
    
    return sections.join('\n\n');
  }
  
  private formatSectionName(name: string): string {
    // Special cases for common names
    const specialCases: Record<string, string> = {
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'nodejs': 'Node.js',
      'react': 'React',
      'vue': 'Vue',
      'angular': 'Angular',
      'next': 'Next.js',
      'nuxt': 'Nuxt',
      'tailwind': 'Tailwind CSS',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB'
    };
    
    if (specialCases[name.toLowerCase()]) {
      return specialCases[name.toLowerCase()];
    }
    
    // Convert kebab-case to Title Case
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}