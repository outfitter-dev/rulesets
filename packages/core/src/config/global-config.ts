import { homedir } from "node:os";
import { join } from "node:path";
import { exists } from "node:fs/promises";
import * as TOML from "@iarna/toml";

export interface GlobalConfigOptions {
  platform?: string;
  configPath?: string;
}

export interface RulesetsConfig {
  version: string;
  default_destination: string;
}

export interface DefaultsConfig {
  auto_detect: boolean;
  auto_suggest: boolean;
  install_location: "project" | "global";
}

export interface GlobalConfigData {
  rulesets: RulesetsConfig;
  defaults: DefaultsConfig;
  destinations: Record<string, string>;
  detection: {
    patterns: Record<string, string[]>;
    dependencies: Record<string, string[]>;
  };
}

export class GlobalConfig {
  private platform: string;
  private configPath?: string;

  constructor(options: GlobalConfigOptions = {}) {
    this.platform = options.platform || process.platform;
    this.configPath = options.configPath;
  }

  getGlobalDirectory(): string {
    // Don't use search paths here, just return the default
    return join(homedir(), ".rulesets");
  }

  getSearchPaths(): string[] {
    const paths: string[] = [
      join(homedir(), ".rulesets"),
    ];

    // Only add XDG path if explicitly set (not just present)
    const xdgHome = process.env.XDG_CONFIG_HOME;
    if (xdgHome && xdgHome.trim()) {
      // Add as second priority, not first
      paths.push(join(xdgHome, "rulesets"));
    }

    if (this.platform === "darwin") {
      paths.push(join(homedir(), "Library", "Application Support", "rulesets"));
    }

    return paths;
  }

  async load(): Promise<GlobalConfigData> {
    const configPath = this.configPath || join(this.getGlobalDirectory(), "config.toml");
    
    try {
      const fileExists = await exists(configPath);
      if (!fileExists) {
        return this.getDefaultConfig();
      }

      const content = await Bun.file(configPath).text();
      const parsed = TOML.parse(content) as any;
      
      return {
        rulesets: {
          version: parsed.rulesets?.version || "1.0.0",
          default_destination: parsed.rulesets?.default_destination || "agents-md",
        },
        defaults: {
          auto_detect: parsed.defaults?.auto_detect ?? true,
          auto_suggest: parsed.defaults?.auto_suggest ?? true,
          install_location: parsed.defaults?.install_location || "project",
        },
        destinations: parsed.destinations || {},
        detection: {
          patterns: parsed.detection?.patterns || {},
          dependencies: parsed.detection?.dependencies || {},
        },
      };
    } catch (error) {
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): GlobalConfigData {
    return {
      rulesets: {
        version: "1.0.0",
        default_destination: "agents-md",
      },
      defaults: {
        auto_detect: true,
        auto_suggest: true,
        install_location: "project",
      },
      destinations: {},
      detection: {
        patterns: {},
        dependencies: {},
      },
    };
  }
}