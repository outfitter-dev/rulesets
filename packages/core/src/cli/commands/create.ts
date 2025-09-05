import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { GlobalConfig } from "../../config/global-config";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import * as TOML from "@iarna/toml";

export function createCommand(program: Command) {
  program
    .command("create <name>")
    .description("Create a new ruleset")
    .option("--global", "Create globally (default)")
    .option("--extends <rulesets...>", "Extend existing rulesets")
    .option("--tags <tags...>", "Add tags to the ruleset")
    .action(async (name: string, options) => {
      const spinner = ora(`Creating ruleset '${name}'...`).start();
      
      try {
        const config = new GlobalConfig();
        const globalDir = config.getGlobalDirectory();
        const rulesetDir = join(globalDir, "sets", name);
        
        // Create directory
        await mkdir(rulesetDir, { recursive: true });
        
        // Create meta.toml
        const meta = {
          set: {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            version: "1.0.0",
            description: `${name} development rules`,
            author: process.env.USER || "User",
            tags: options.tags || [name],
          },
          extends: options.extends ? { sets: options.extends } : undefined,
        };
        
        await Bun.write(
          join(rulesetDir, "meta.toml"),
          TOML.stringify(meta as any)
        );
        
        // Create rules.md template
        const rulesTemplate = `# ${name.charAt(0).toUpperCase() + name.slice(1)} Rules

## Overview
Add a brief description of what these rules are for.

## Code Style
- Add your code style rules here
- Use consistent formatting
- Follow project conventions

## Best Practices
- Write clean, maintainable code
- Add tests for new features
- Document complex logic

## Project-Specific Guidelines
- Add any project-specific rules here
`;
        
        await Bun.write(join(rulesetDir, "rules.md"), rulesTemplate);
        
        spinner.succeed(chalk.green(`Created ruleset '${name}' at ${rulesetDir}`));
        
        console.log(chalk.cyan("\nNext steps:"));
        console.log(`  1. Edit ${join(rulesetDir, "rules.md")} to add your rules`);
        console.log(`  2. Run 'rulesets install ${name}' in a project to use it`);
        
      } catch (error: any) {
        spinner.fail(chalk.red(`Failed to create ruleset: ${error.message}`));
        process.exit(1);
      }
    });
}