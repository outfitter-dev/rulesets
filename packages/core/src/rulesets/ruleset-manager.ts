import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import * as TOML from "@iarna/toml";
import { Ruleset, type RulesetMetadata } from "./ruleset";

export interface RulesetManagerOptions {
  globalDir: string;
}

export interface ComposedRuleset {
  name: string;
  rules: string;
  metadata: RulesetMetadata;
}

export interface CreateRulesetOptions {
  rules?: string;
  extends?: string[];
  metadata?: Partial<RulesetMetadata>;
}

export class RulesetManager {
  private globalDir: string;
  private compositionCache = new Map<string, ComposedRuleset>();

  constructor(options: RulesetManagerOptions) {
    this.globalDir = options.globalDir;
  }

  async compose(name: string, visited = new Set<string>()): Promise<ComposedRuleset> {
    // Check for circular dependencies
    if (visited.has(name)) {
      throw new Error(`Circular dependency detected: ${name} is already being processed`);
    }
    visited.add(name);

    // Check cache
    if (this.compositionCache.has(name)) {
      return this.compositionCache.get(name)!;
    }

    const rulesetPath = join(this.globalDir, "sets", name);
    const ruleset = new Ruleset(rulesetPath);
    
    let metadata: RulesetMetadata;
    let rules = "";

    try {
      metadata = await ruleset.loadMetadata();
      rules = await ruleset.getRules();
    } catch (error) {
      throw new Error(`Failed to load ruleset '${name}': ${error}`);
    }

    // Process extends
    const composedRules: string[] = [];
    
    if (metadata.extends?.sets && metadata.extends.sets.length > 0) {
      for (const parentSet of metadata.extends.sets) {
        const parentComposed = await this.compose(parentSet, new Set(visited));
        composedRules.push(parentComposed.rules);
      }
    }
    
    // Add current ruleset's rules
    composedRules.push(rules);

    const composed: ComposedRuleset = {
      name,
      rules: composedRules.filter(r => r.trim()).join("\n\n"),
      metadata,
    };

    this.compositionCache.set(name, composed);
    return composed;
  }

  async createRuleset(name: string, options: CreateRulesetOptions): Promise<void> {
    const rulesetPath = join(this.globalDir, "sets", name);
    
    // Create directory
    await mkdir(rulesetPath, { recursive: true });

    // Write rules file if provided
    if (options.rules) {
      const rulesPath = join(rulesetPath, "rules.md");
      await Bun.write(rulesPath, options.rules);
    }

    // Create metadata
    const metadata: any = {
      set: {
        name: options.metadata?.set?.name || name.charAt(0).toUpperCase() + name.slice(1),
        version: options.metadata?.set?.version || "1.0.0",
        description: options.metadata?.set?.description,
        author: options.metadata?.set?.author,
        tags: options.metadata?.set?.tags || [],
      },
    };

    if (options.extends && options.extends.length > 0) {
      metadata.extends = {
        sets: options.extends,
      };
    }

    if (options.metadata?.requires) {
      metadata.requires = options.metadata.requires;
    }

    if (options.metadata?.overrides) {
      metadata.overrides = options.metadata.overrides;
    }

    // Write meta.toml
    const metaPath = join(rulesetPath, "meta.toml");
    const tomlContent = TOML.stringify(metadata as any);
    await Bun.write(metaPath, tomlContent);
  }

  async listRulesets(): Promise<string[]> {
    // Implementation would scan the sets directory
    return [];
  }

  clearCache(): void {
    this.compositionCache.clear();
  }
}