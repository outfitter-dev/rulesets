import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { GlobalConfig } from '../config/global-config';

/**
 * Detects project type and suggests appropriate rulesets.
 */

export interface DetectionResult {
  detectedFiles: string[];
  detectedPackages: string[];
  suggestedSets: string[];
  confidence: 'high' | 'medium' | 'low';
}

export class ProjectDetector {
  constructor(private config: GlobalConfig) {}
  
  /**
   * Detect project type and suggest rulesets.
   */
  async detect(projectPath: string = process.cwd()): Promise<DetectionResult> {
    const result: DetectionResult = {
      detectedFiles: [],
      detectedPackages: [],
      suggestedSets: new Set<string>() as any,
      confidence: 'low',
    };
    
    // Check for marker files
    await this.detectMarkerFiles(projectPath, result);
    
    // Check package dependencies
    await this.detectPackageDependencies(projectPath, result);
    
    // Check for language-specific files
    await this.detectLanguageFiles(projectPath, result);
    
    // Deduplicate and convert set to array
    result.suggestedSets = Array.from(result.suggestedSets as any);
    
    // Calculate confidence
    result.confidence = this.calculateConfidence(result);
    
    return result;
  }
  
  /**
   * Detect marker files (package.json, cargo.toml, etc).
   */
  private async detectMarkerFiles(projectPath: string, result: DetectionResult): Promise<void> {
    const patterns = this.config.detection?.patterns || {};
    
    for (const [pattern, sets] of Object.entries(patterns)) {
      const filePath = path.join(projectPath, pattern);
      try {
        await fs.access(filePath);
        result.detectedFiles.push(pattern);
        sets.forEach(set => (result.suggestedSets as Set<string>).add(set));
      } catch {
        // File doesn't exist
      }
    }
  }
  
  /**
   * Detect package dependencies.
   */
  private async detectPackageDependencies(projectPath: string, result: DetectionResult): Promise<void> {
    // Check package.json dependencies
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };
      
      const depPatterns = this.config.detection?.dependencies || {};
      
      for (const [dep, sets] of Object.entries(depPatterns)) {
        if (dep in allDeps) {
          result.detectedPackages.push(dep);
          sets.forEach(set => (result.suggestedSets as Set<string>).add(set));
        }
      }
      
      // Special detection for common patterns
      this.detectSpecialPackages(allDeps, result);
    } catch {
      // No package.json or invalid JSON
    }
    
    // Check cargo.toml dependencies
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
    try {
      const content = await fs.readFile(cargoTomlPath, 'utf-8');
      // Simple pattern matching for now (TODO: proper TOML parsing)
      if (content.includes('tokio')) {
        result.detectedPackages.push('tokio');
        (result.suggestedSets as Set<string>).add('async-rust');
      }
      if (content.includes('actix-web') || content.includes('axum')) {
        (result.suggestedSets as Set<string>).add('rust-web');
      }
    } catch {
      // No Cargo.toml
    }
  }
  
  /**
   * Detect special package combinations.
   */
  private detectSpecialPackages(deps: Record<string, string>, result: DetectionResult): void {
    // TypeScript + React
    if ('typescript' in deps && ('react' in deps || '@types/react' in deps)) {
      (result.suggestedSets as Set<string>).add('react-typescript');
    }
    
    // Next.js (implies React and TypeScript usually)
    if ('next' in deps) {
      (result.suggestedSets as Set<string>).add('nextjs');
      (result.suggestedSets as Set<string>).add('react');
      if ('typescript' in deps) {
        (result.suggestedSets as Set<string>).add('typescript');
      }
    }
    
    // Bun runtime
    if ('@types/bun' in deps) {
      (result.suggestedSets as Set<string>).add('bun');
      (result.suggestedSets as Set<string>).add('typescript');
    }
    
    // Testing frameworks
    if ('vitest' in deps) {
      (result.suggestedSets as Set<string>).add('testing-vitest');
    } else if ('jest' in deps || '@types/jest' in deps) {
      (result.suggestedSets as Set<string>).add('testing-jest');
    } else if ('mocha' in deps) {
      (result.suggestedSets as Set<string>).add('testing-mocha');
    }
    
    // Build tools
    if ('vite' in deps) {
      (result.suggestedSets as Set<string>).add('vite');
    } else if ('webpack' in deps) {
      (result.suggestedSets as Set<string>).add('webpack');
    }
    
    // CSS frameworks
    if ('tailwindcss' in deps) {
      (result.suggestedSets as Set<string>).add('tailwind');
    }
    
    // Database/ORM
    if ('prisma' in deps || '@prisma/client' in deps) {
      (result.suggestedSets as Set<string>).add('prisma');
    } else if ('typeorm' in deps) {
      (result.suggestedSets as Set<string>).add('typeorm');
    } else if ('mongoose' in deps) {
      (result.suggestedSets as Set<string>).add('mongodb');
    }
  }
  
  /**
   * Detect language-specific files.
   */
  private async detectLanguageFiles(projectPath: string, result: DetectionResult): Promise<void> {
    try {
      const files = await fs.readdir(projectPath);
      
      // TypeScript
      if (files.some(f => f === 'tsconfig.json')) {
        result.detectedFiles.push('tsconfig.json');
        (result.suggestedSets as Set<string>).add('typescript');
      }
      
      // ESLint
      if (files.some(f => f.startsWith('.eslintrc') || f === 'eslint.config.js')) {
        (result.suggestedSets as Set<string>).add('eslint');
      }
      
      // Prettier
      if (files.some(f => f === '.prettierrc' || f === 'prettier.config.js')) {
        (result.suggestedSets as Set<string>).add('prettier');
      }
      
      // Docker
      if (files.some(f => f === 'Dockerfile' || f === 'docker-compose.yml')) {
        result.detectedFiles.push('Dockerfile');
        (result.suggestedSets as Set<string>).add('docker');
      }
      
      // GitHub Actions
      const githubDir = path.join(projectPath, '.github', 'workflows');
      try {
        await fs.access(githubDir);
        result.detectedFiles.push('.github/workflows/');
        (result.suggestedSets as Set<string>).add('github-actions');
      } catch {
        // No GitHub workflows
      }
      
      // Monorepo detection
      if (files.some(f => f === 'lerna.json')) {
        (result.suggestedSets as Set<string>).add('lerna');
        (result.suggestedSets as Set<string>).add('monorepo');
      } else if (files.some(f => f === 'pnpm-workspace.yaml')) {
        (result.suggestedSets as Set<string>).add('pnpm');
        (result.suggestedSets as Set<string>).add('monorepo');
      } else if (files.some(f => f === 'turbo.json')) {
        (result.suggestedSets as Set<string>).add('turborepo');
        (result.suggestedSets as Set<string>).add('monorepo');
      }
    } catch {
      // Error reading directory
    }
  }
  
  /**
   * Calculate confidence level based on detections.
   */
  private calculateConfidence(result: DetectionResult): 'high' | 'medium' | 'low' {
    const score = result.detectedFiles.length + result.detectedPackages.length;
    
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }
  
  /**
   * Get a human-readable summary of the detection.
   */
  getSummary(result: DetectionResult): string {
    const lines: string[] = [];
    
    if (result.detectedFiles.length > 0) {
      lines.push(`Detected files: ${result.detectedFiles.join(', ')}`);
    }
    
    if (result.detectedPackages.length > 0) {
      lines.push(`Detected packages: ${result.detectedPackages.join(', ')}`);
    }
    
    if (result.suggestedSets.length > 0) {
      lines.push(`Suggested rulesets: ${result.suggestedSets.join(', ')}`);
    }
    
    lines.push(`Confidence: ${result.confidence}`);
    
    return lines.join('\n');
  }
}