import { Command } from "commander";
import chalk from "chalk";
import { GlobalConfig } from "../../config/global-config";
import { RulesetManager } from "../../rulesets/ruleset-manager";
import { Ruleset } from "../../rulesets/ruleset";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

interface ListOptions {
  global?: boolean;
  packs?: boolean;
  installed?: boolean;
  verbose?: boolean;
}

interface RulesetInfo {
  name: string;
  version: string;
  description?: string;
  tags?: string[];
  extends?: string[];
}

export function listCommand(program: Command) {
  program
    .command("list")
    .description("List available rulesets")
    .option("--global", "List global rulesets (default)")
    .option("--packs", "List available packs")
    .option("--installed", "List rulesets installed in current project")
    .option("-v, --verbose", "Show detailed information")
    .action(async (options: ListOptions) => {
      try {
        if (options.installed) {
          await listInstalledRulesets(options);
        } else if (options.packs) {
          await listPacks(options);
        } else {
          await listGlobalRulesets(options);
        }
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

async function listGlobalRulesets(options: ListOptions) {
  const config = new GlobalConfig();
  const globalDir = config.getGlobalDirectory();
  const setsDir = join(globalDir, "sets");
  
  const rulesets = await getRulesetsFromDirectory(setsDir);
  
  if (rulesets.length === 0) {
    console.log(chalk.yellow("No rulesets found."));
    console.log(chalk.gray(`Run 'rulesets init --global' to initialize.`));
    return;
  }
  
  console.log(chalk.cyan.bold("Available Rulesets:\n"));
  
  for (const ruleset of rulesets) {
    displayRuleset(ruleset, options);
  }
  
  console.log(chalk.gray(`\nFound ${rulesets.length} ruleset(s) in ${globalDir}`));
}

async function listPacks(options: ListOptions) {
  const config = new GlobalConfig();
  const globalDir = config.getGlobalDirectory();
  const packsDir = join(globalDir, "packs");
  
  try {
    const entries = await readdir(packsDir);
    const packs = entries.filter(e => e.endsWith(".toml"));
    
    if (packs.length === 0) {
      console.log(chalk.yellow("No packs found."));
      return;
    }
    
    console.log(chalk.cyan.bold("Available Packs:\n"));
    
    for (const pack of packs) {
      await displayPack(join(packsDir, pack), options);
    }
    
  } catch (error) {
    console.log(chalk.yellow("No packs directory found."));
  }
}

async function listInstalledRulesets(options: ListOptions) {
  try {
    const installedPath = join(".rulesets", "installed.toml");
    const content = await Bun.file(installedPath).text();
    const parsed = await import("@iarna/toml").then(m => m.parse(content));
    
    const installed = (parsed as any).installed || {};
    
    if (Object.keys(installed).length === 0) {
      console.log(chalk.yellow("No rulesets installed in this project."));
      console.log(chalk.gray("Run 'rulesets detect' to find suggested rulesets."));
      return;
    }
    
    console.log(chalk.cyan.bold("Installed Rulesets:\n"));
    
    for (const [name, info] of Object.entries(installed)) {
      displayInstalledRuleset(name, info as any, options);
    }
    
  } catch (error) {
    console.log(chalk.yellow("No project rulesets found."));
    console.log(chalk.gray("Run 'rulesets init' to initialize project rulesets."));
  }
}

async function getRulesetsFromDirectory(dir: string): Promise<RulesetInfo[]> {
  const rulesets: RulesetInfo[] = [];
  
  try {
    const entries = await readdir(dir);
    
    for (const entry of entries) {
      const rulesetPath = join(dir, entry);
      const ruleset = new Ruleset(rulesetPath);
      
      try {
        const metadata = await ruleset.loadMetadata();
        rulesets.push({
          name: metadata.set.name,
          version: metadata.set.version,
          description: metadata.set.description,
          tags: metadata.set.tags,
          extends: metadata.extends?.sets,
        });
      } catch {
        // Skip invalid rulesets
      }
    }
  } catch {
    // Directory doesn't exist
  }
  
  return rulesets.sort((a, b) => a.name.localeCompare(b.name));
}

function displayRuleset(ruleset: RulesetInfo, options: ListOptions) {
  const name = chalk.green.bold(ruleset.name.padEnd(20));
  const version = chalk.gray(`v${ruleset.version}`);
  
  console.log(`  ${name} ${version}`);
  
  if (options.verbose) {
    if (ruleset.description) {
      console.log(`    ${chalk.gray(ruleset.description)}`);
    }
    if (ruleset.tags && ruleset.tags.length > 0) {
      console.log(`    ${chalk.blue("Tags:")} ${ruleset.tags.join(", ")}`);
    }
    if (ruleset.extends && ruleset.extends.length > 0) {
      console.log(`    ${chalk.magenta("Extends:")} ${ruleset.extends.join(", ")}`);
    }
    console.log();
  }
}

async function displayPack(packPath: string, options: ListOptions) {
  try {
    const content = await Bun.file(packPath).text();
    const parsed = await import("@iarna/toml").then(m => m.parse(content));
    const pack = parsed as any;
    
    const name = chalk.green.bold(pack.pack.name.padEnd(20));
    const version = chalk.gray(`v${pack.pack.version}`);
    
    console.log(`  ${name} ${version}`);
    
    if (options.verbose) {
      if (pack.pack.description) {
        console.log(`    ${chalk.gray(pack.pack.description)}`);
      }
      if (pack.includes?.sets) {
        console.log(`    ${chalk.blue("Includes:")} ${pack.includes.sets.join(", ")}`);
      }
      console.log();
    }
  } catch {
    // Invalid pack file
  }
}

function displayInstalledRuleset(name: string, info: any, options: ListOptions) {
  const displayName = chalk.green.bold(name.padEnd(20));
  const version = chalk.gray(`v${info.version}`);
  const source = chalk.blue(`[${info.source}]`);
  
  console.log(`  ${displayName} ${version} ${source}`);
  
  if (options.verbose && info.modified) {
    console.log(`    ${chalk.yellow("Modified locally")}`);
  }
}