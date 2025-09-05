import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { InstallationManager } from "../../installation/installation-manager";
import { GlobalConfig } from "../../config/global-config";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { exists } from "../../utils/fs-helpers";
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

async function installGlobal(rulesets: string[], options: InstallOptions, spinner: ReturnType<typeof ora>) {
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

async function installToProject(rulesets: string[], options: InstallOptions, spinner: ReturnType<typeof ora>) {
  // Ensure project is initialized
  await ensureProjectInitialized();
  
  const manager = new InstallationManager();
  
  // Determine destinations based on options or detect from project
  const destinations = options.destination 
    ? [options.destination]
    : await detectDestinations();
  
  let installed = 0;
  let failed = 0;
  
  for (const ruleset of rulesets) {
    spinner.text = `Installing ${ruleset}...`;
    
    const result = await manager.installRuleset(ruleset, destinations, {
      force: options.force
    });
    
    if (result.success) {
      installed++;
      spinner.text = chalk.green(`✓ Installed ${ruleset} to ${result.installedTo?.join(", ")}`);
    } else {
      failed++;
      spinner.warn(chalk.yellow(`Failed to install ${ruleset}: ${result.reason}`));
    }
  }
  
  if (installed > 0) {
    spinner.succeed(chalk.green(`Successfully installed ${installed} ruleset(s)`));
    if (failed > 0) {
      console.log(chalk.yellow(`Failed to install ${failed} ruleset(s)`));
    }
    console.log(chalk.gray("\nRun 'rulesets sync' to update from global later"));
  } else {
    spinner.fail(chalk.red(`Failed to install any rulesets`));
  }
}

async function ensureProjectInitialized() {
  const projectDir = ".rulesets";
  
  if (!(await exists(projectDir))) {
    await mkdir(projectDir, { recursive: true });
    
    // Create initial installed.json
    const config = {
      "_comment": "Auto-generated - do not edit manually",
      installed: {},
      modified: {},
    };
    
    await Bun.write(
      join(projectDir, "installed.json"),
      JSON.stringify(config, null, 2)
    );
  }
}

async function detectDestinations(): Promise<string[]> {
  const destinations: string[] = [];
  
  // Check for common AI tool directories
  const checks = [
    { path: ".claude", dest: "claude-code" },
    { path: ".cursor", dest: "cursor" },
    { path: ".windsurf", dest: "windsurf" },
    { path: ".github/copilot", dest: "copilot" },
    { path: "AGENTS.md", dest: "agents-md" }
  ];
  
  for (const check of checks) {
    if (await exists(check.path)) {
      destinations.push(check.dest);
    }
  }
  
  // Default to common destinations if none detected
  if (destinations.length === 0) {
    return ["claude-code", "cursor", "agents-md"];
  }
  
  return destinations;
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
  
  // Keep meta.toml as TOML (user-editable config)
  const TOML = await import("@iarna/toml");
  await Bun.write(join(dir, "meta.toml"), TOML.stringify(meta as any));
  
  // Create rules.md
  const rules = `# ${name} Rules

Add your ${name} rules here.
`;
  
  await Bun.write(join(dir, "rules.md"), rules);
}