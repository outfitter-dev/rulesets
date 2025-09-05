import { join, dirname } from "node:path";
import { readdir, mkdir } from "node:fs/promises";
import { exists } from "node:fs/promises";
import * as TOML from "@iarna/toml";

export interface RulesetMetadata {
  set: {
    name: string;
    version: string;
    description?: string;
    author?: string;
    tags?: string[];
  };
  extends?: {
    sets: string[];
  };
  requires?: {
    sets: string[];
    optional?: string[];
  };
  overrides?: Record<string, any>;
}

export class Ruleset {
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  async loadMetadata(): Promise<RulesetMetadata> {
    const metaPath = join(this.path, "meta.toml");
    
    try {
      // Ensure directory exists
      const dirPath = dirname(metaPath);
      if (!(await exists(dirPath))) {
        await mkdir(dirPath, { recursive: true });
      }

      const content = await Bun.file(metaPath).text();
      const parsed = TOML.parse(content) as any;
      
      return {
        set: {
          name: parsed.set?.name || "",
          version: parsed.set?.version || "1.0.0",
          description: parsed.set?.description,
          author: parsed.set?.author,
          tags: parsed.set?.tags || [],
        },
        extends: parsed.extends ? {
          sets: parsed.extends.sets || [],
        } : undefined,
        requires: parsed.requires ? {
          sets: parsed.requires.sets || [],
          optional: parsed.requires.optional || [],
        } : undefined,
        overrides: parsed.overrides || {},
      };
    } catch (error) {
      throw new Error(`Failed to load metadata from ${metaPath}: ${error}`);
    }
  }

  async getFiles(): Promise<string[]> {
    try {
      // Ensure directory exists before reading
      if (!(await exists(this.path))) {
        await mkdir(this.path, { recursive: true });
      }

      const entries = await readdir(this.path);
      return entries.filter(entry => !entry.startsWith("."));
    } catch (error) {
      return [];
    }
  }

  async validate(): Promise<void> {
    const metadata = await this.loadMetadata();
    
    if (!metadata.set.name) {
      throw new Error("Missing required field: name");
    }
  }

  async getOverrides(): Promise<Record<string, any>> {
    try {
      const metaPath = join(this.path, "meta.toml");
      const content = await Bun.file(metaPath).text();
      const parsed = TOML.parse(content) as any;
      return parsed.overrides || {};
    } catch (error) {
      return {};
    }
  }

  async getRules(): Promise<string> {
    try {
      const rulesPath = join(this.path, "rules.md");
      if (await exists(rulesPath)) {
        return await Bun.file(rulesPath).text();
      }
      return "";
    } catch (error) {
      return "";
    }
  }
}