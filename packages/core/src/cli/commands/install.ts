import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { GlobalConfig } from "../../config/global-config";
import { RulesetManager } from "../../rulesets/ruleset-manager";
import { Ruleset } from "../../rulesets/ruleset";
import { join } from "node:path";
import { mkdir, copyFile, exists } from "node:fs/promises";
import * as TOML from "@iarna/toml";

interface InstallOptions {
  global?: boolean;
  force?: boolean;
  destination?: string;
}

export function installCommand(program: Command) {
  program
    .command("install <rulesets...>")
    .description("Install rulesets to your project")
    .option("--global", "Install globally to ~/.rulesets/sets/")
    .option("-f, --force", "Overwrite existing rulesets")
    .option("-d, --destination <dest>", "Specify destination (claude-code, cursor, etc.)")
    .action(async (rulesets: string[], options: InstallOptions) => {
      const spinner = ora("Installing rulesets...").start();
      
      try {
        if (options.global) {
          await installGlobal(rulesets, options, spinner);
        } else {
          await installToProject(rulesets, options, spinner);
        }
      } catch (error: any) {
        spinner.fail(chalk.red(`Installation failed: ${error.message}`));
        process.exit(1);
      }
    });
}

async function installGlobal(rulesets: string[], options: InstallOptions, spinner: ora.Ora) {
  const config = new GlobalConfig();
  const globalDir = config.getGlobalDirectory();
  const setsDir = join(globalDir, "sets");
  
  let installed = 0;
  
  for (const ruleset of rulesets) {
    spinner.text = `Installing ${ruleset} globally...`;
    
    const targetDir = join(setsDir, ruleset);
    
    // Check if already exists
    if (await exists(targetDir)) {
      if (!options.force) {
        spinner.warn(chalk.yellow(`${ruleset} already exists (use --force to overwrite)`));
        continue;
      }
    }
    
    // For now, just create a placeholder
    // In the future, this would download from registry
    await createPlaceholderRuleset(targetDir, ruleset);
    installed++;
  }
  
  if (installed > 0) {
    spinner.succeed(chalk.green(`Installed ${installed} ruleset(s) globally`));
  }
}

async function installToProject(rulesets: string[], options: InstallOptions, spinner: ora.Ora) {
  // Ensure project is initialized
  await ensureProjectInitialized();
  
  const config = new GlobalConfig();
  const globalDir = config.getGlobalDirectory();
  const manager = new RulesetManager({ globalDir });
  
  let installed = 0;
  const installedInfo: Record<string, any> = {};
  
  for (const ruleset of rulesets) {
    spinner.text = `Installing ${ruleset}...`;
    
    try {
      // Compose the ruleset (with inheritance)
      const composed = await manager.compose(ruleset);
      
      // Install to destinations
      const destinations = await installToDestinations(composed, options);
      
      // Track installation
      installedInfo[ruleset] = {
        version: composed.metadata.set.version,
        source: "global",
        destinations,
        installedAt: new Date().toISOString(),
      };
      
      installed++;
    } catch (error: any) {
      spinner.warn(chalk.yellow(`Failed to install ${ruleset}: ${error.message}`));
    }
  }
  
  // Update installed.toml
  await updateInstalledConfig(installedInfo);
  
  if (installed > 0) {
    spinner.succeed(chalk.green(`Installed ${installed} ruleset(s) to project`));
    console.log(chalk.gray("\nRun 'rulesets sync' to update from global later"));
  }
}

async function ensureProjectInitialized() {
  const projectDir = ".rulesets";
  
  if (!(await exists(projectDir))) {
    await mkdir(projectDir, { recursive: true });
    
    // Create initial installed.toml
    const config = {
      installed: {},
      modified: {},
    };
    
    await Bun.write(join(projectDir, "installed.toml"), TOML.stringify(config));
  }
}

async function installToDestinations(composed: any, options: InstallOptions) {
  const destinations: string[] = [];
  
  // Determine destinations
  const targets = options.destination 
    ? [options.destination]
    : ["claude-code", "cursor", "agents-md"];
  
  for (const target of targets) {
    const installed = await installToDestination(target, composed.rules);
    if (installed) {
      destinations.push(target);
    }
  }
  
  return destinations;
}

async function installToDestination(destination: string, rules: string): Promise<boolean> {
  // Map destinations to file paths
  const destinationPaths: Record<string, string> = {
    "claude-code": ".claude/CLAUDE.md",
    "cursor": ".cursor/rules/ruleset.md",
    "windsurf": ".windsurf/rules/ruleset.md",
    "agents-md": "AGENTS.md",
    "copilot": ".github/copilot/instructions.md",
  };
  
  const path = destinationPaths[destination];
  if (!path) {
    return false;
  }
  
  // Create directory if needed
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir) {
    await mkdir(dir, { recursive: true });
  }
  
  // Write rules
  await Bun.write(path, rules);
  return true;
}

async function updateInstalledConfig(installedInfo: Record<string, any>) {
  const configPath = join(".rulesets", "installed.toml");
  
  // Load existing config
  let config: any = { installed: {}, modified: {} };
  
  try {
    const content = await Bun.file(configPath).text();
    config = TOML.parse(content);
  } catch {
    // File doesn't exist or is invalid
  }
  
  // Update with new installations
  Object.assign(config.installed, installedInfo);
  
  // Write back
  await Bun.write(configPath, TOML.stringify(config));
}

async function createPlaceholderRuleset(dir: string, name: string) {
  await mkdir(dir, { recursive: true });
  
  // Create meta.toml
  const meta = {
    set: {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      version: "1.0.0",
      description: `${name} ruleset`,
      author: "User",
      tags: [name],
    },
  };
  
  await Bun.write(join(dir, "meta.toml"), TOML.stringify(meta as any));
  
  // Create rules.md
  const rules = `# ${name} Rules

Add your ${name} rules here.
`;
  
  await Bun.write(join(dir, "rules.md"), rules);
}