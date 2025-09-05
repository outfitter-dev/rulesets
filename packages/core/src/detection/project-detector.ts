import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { exists } from "../utils/fs-helpers";
import * as TOML from "@iarna/toml";

export interface DetectionConfig {
  detection?: {
    patterns?: Record<string, string[]>;
    dependencies?: Record<string, string[]>;
  };
}

export interface DetectionResult {
  projectType: string[];
  detectedFiles: string[];
  detectedDependencies: string[];
  suggestedSets: string[];
  suggestions: Array<{
    set: string;
    confidence: number;
    reason: string;
  }>;
}

interface FileDetection {
  path: string;
  type: string;
  suggestedSets: string[];
}

interface DependencyDetection {
  name: string;
  suggestedSets: string[];
}

export class ProjectDetector {
  private config: DetectionConfig;
  
  constructor(config: DetectionConfig = {}) {
    this.config = config;
  }
  
  async detect(projectPath: string): Promise<DetectionResult> {
    const detectedFiles: string[] = [];
    const detectedDependencies: string[] = [];
    const projectTypes = new Set<string>();
    const suggestedSets = new Map<string, { confidence: number; reasons: string[] }>();
    
    // Scan for marker files
    const fileDetections = await this.scanForMarkerFiles(projectPath);
    
    for (const detection of fileDetections) {
      detectedFiles.push(detection.path);
      projectTypes.add(detection.type);
      
      // Add suggested sets from file patterns
      for (const set of detection.suggestedSets) {
        this.addSuggestion(suggestedSets, set, 0.7, `Found ${basename(detection.path)}`);
      }
    }
    
    // Parse dependencies from detected files
    const dependencies = await this.parseDependencies(projectPath, fileDetections);
    
    for (const dep of dependencies) {
      detectedDependencies.push(dep.name);
      
      // Add suggested sets from dependencies
      for (const set of dep.suggestedSets) {
        // Use lower confidence for generic node suggestions
        const confidence = (dep.name === "express" && set === "node") ? 0.6 : 0.9;
        const reason = `Found ${dep.name} in package.json`;
        this.addSuggestion(suggestedSets, set, confidence, reason);
      }
    }
    
    // Convert suggestions to sorted array
    const suggestions = this.formatSuggestions(suggestedSets);
    const sortedSets = suggestions.map(s => s.set);
    
    return {
      projectType: Array.from(projectTypes),
      detectedFiles,
      detectedDependencies,
      suggestedSets: sortedSets,
      suggestions,
    };
  }
  
  private async scanForMarkerFiles(projectPath: string): Promise<FileDetection[]> {
    const detections: FileDetection[] = [];
    
    // Define marker files and their implications
    const markerFiles = [
      { file: "package.json", type: "node", sets: ["node"] },
      { file: "Cargo.toml", type: "rust", sets: ["rust"] },
      { file: "requirements.txt", type: "python", sets: ["python"] },
      { file: "go.mod", type: "go", sets: ["go"] },
      { file: "Dockerfile", type: "docker", sets: ["docker"] },
      { file: "docker-compose.yml", type: "docker", sets: ["docker"] },
      { file: ".github/workflows", type: "github", sets: ["github-actions"], isDir: true },
    ];
    
    for (const marker of markerFiles) {
      const markerPath = join(projectPath, marker.file);
      
      if (await exists(markerPath)) {
        if (marker.isDir) {
          // Check for workflow files
          const files = await this.findFilesInDir(markerPath, ".yml", ".yaml");
          if (files.length > 0) {
            detections.push({
              path: `${marker.file}/${basename(files[0])}`,
              type: marker.type,
              suggestedSets: marker.sets,
            });
          }
        } else {
          // Use config patterns if available
          const configSets = this.config.detection?.patterns?.[marker.file] || marker.sets;
          
          detections.push({
            path: marker.file,
            type: marker.type,
            suggestedSets: configSets,
          });
        }
      }
    }
    
    return detections;
  }
  
  private async findFilesInDir(dir: string, ...extensions: string[]): Promise<string[]> {
    try {
      const entries = await readdir(dir);
      return entries.filter(e => extensions.some(ext => e.endsWith(ext))).map(e => join(dir, e));
    } catch {
      return [];
    }
  }
  
  private async parseDependencies(projectPath: string, fileDetections: FileDetection[]): Promise<DependencyDetection[]> {
    const dependencies: DependencyDetection[] = [];
    
    for (const detection of fileDetections) {
      const filePath = join(projectPath, detection.path);
      
      if (detection.path === "package.json") {
        const deps = await this.parsePackageJson(filePath);
        dependencies.push(...deps);
      } else if (detection.path === "Cargo.toml") {
        const deps = await this.parseCargoToml(filePath);
        dependencies.push(...deps);
      } else if (detection.path === "requirements.txt") {
        const deps = await this.parseRequirementsTxt(filePath);
        dependencies.push(...deps);
      }
    }
    
    return dependencies;
  }
  
  private async parsePackageJson(filePath: string): Promise<DependencyDetection[]> {
    try {
      const content = await readFile(filePath, "utf-8");
      const pkg = JSON.parse(content);
      const dependencies: DependencyDetection[] = [];
      
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      
      for (const [name] of Object.entries(allDeps)) {
        const sets = this.getSetsForDependency(name);
        
        // Special handling for Node.js frameworks  
        if (name === "express" || name === "fastify") {
          // Add node suggestion separately with lower confidence
          dependencies.push({ name, suggestedSets: ["node"] });
        } else if (sets.length > 0) {
          dependencies.push({ name, suggestedSets: sets });
        } else {
          dependencies.push({ name, suggestedSets: [] });
        }
      }
      
      return dependencies;
    } catch {
      return [];
    }
  }
  
  private async parseCargoToml(filePath: string): Promise<DependencyDetection[]> {
    try {
      const content = await readFile(filePath, "utf-8");
      const parsed = TOML.parse(content) as any;
      const dependencies: DependencyDetection[] = [];
      
      if (parsed.dependencies) {
        for (const [name] of Object.entries(parsed.dependencies)) {
          const sets = this.getSetsForDependency(name);
          dependencies.push({ name, suggestedSets: sets });
        }
      }
      
      return dependencies;
    } catch {
      return [];
    }
  }
  
  private async parseRequirementsTxt(filePath: string): Promise<DependencyDetection[]> {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("#"));
      const dependencies: DependencyDetection[] = [];
      
      for (const line of lines) {
        // Extract package name (before ==, >=, ~=, etc.)
        const match = line.match(/^([a-zA-Z0-9-_]+)/);
        if (match) {
          const name = match[1];
          const sets = this.getSetsForDependency(name);
          dependencies.push({ name, suggestedSets: sets });
        }
      }
      
      return dependencies;
    } catch {
      return [];
    }
  }
  
  private getSetsForDependency(dependency: string): string[] {
    const sets: string[] = [];
    
    // Check config first
    const configDeps = this.config.detection?.dependencies || {};
    if (configDeps[dependency]) {
      return configDeps[dependency];
    }
    
    // Built-in dependency mappings
    const mappings: Record<string, string[]> = {
      // TypeScript/JavaScript
      "typescript": ["typescript"],
      "@types/react": ["react", "typescript"],
      "@types/node": ["typescript"],
      
      // Frameworks
      "react": ["react"],
      "react-dom": ["react"],
      "vue": ["vue"],
      "@angular/core": ["angular"],
      "svelte": ["svelte"],
      "solid-js": ["solidjs"],
      "next": ["next"],
      
      // Testing
      "vitest": ["testing-vitest"],
      "jest": ["testing-jest"],
      "pytest": ["testing-pytest"],
      
      // Web frameworks - use lower confidence for generic node suggestion
      "express": [],  // Will be handled separately
      "fastify": [],
      "django": ["python-web"],
      "flask": ["python-web"],
      "fastapi": ["python-web"],
      "axum": ["rust-web"],
      
      // Async
      "tokio": ["async-rust"],
      
      // Styling
      "tailwindcss": ["tailwind"],
      "@tanstack/react-query": ["react"],
      
      // Database
      "sqlx": ["rust"],
    };
    
    if (mappings[dependency]) {
      return mappings[dependency];
    }
    
    return sets;
  }
  
  private addSuggestion(
    suggestions: Map<string, { confidence: number; reasons: string[] }>,
    set: string,
    confidence: number,
    reason: string
  ) {
    if (!suggestions.has(set)) {
      suggestions.set(set, { confidence, reasons: [reason] });
    } else {
      const existing = suggestions.get(set)!;
      existing.confidence = Math.max(existing.confidence, confidence);
      if (!existing.reasons.includes(reason)) {
        existing.reasons.push(reason);
      }
    }
  }
  
  private formatSuggestions(
    suggestions: Map<string, { confidence: number; reasons: string[] }>
  ): Array<{ set: string; confidence: number; reason: string }> {
    return Array.from(suggestions.entries())
      .map(([set, data]) => ({
        set,
        confidence: data.confidence,
        reason: data.reasons.join(", "),
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }
}