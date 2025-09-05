import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { InstallationManager } from "../../installation/installation-manager";

interface SyncOptions {
  preserveLocal?: boolean;
  force?: boolean;
}

export function syncCommand(program: Command) {
  program
    .command("sync [rulesets...]")
    .description("Sync installed rulesets with their global versions")
    .option("-p, --preserve-local", "Preserve local modifications")
    .option("-f, --force", "Force sync even with conflicts")
    .action(async (rulesets: string[], options: SyncOptions) => {
      const spinner = ora("Checking for updates...").start();
      
      try {
        const manager = new InstallationManager();
        
        // Check for updates first
        const updates = await manager.checkForUpdates();
        
        if (updates.length === 0) {
          spinner.succeed(chalk.green("All rulesets are up to date"));
          return;
        }
        
        // Show available updates
        spinner.info(`Found ${updates.length} update(s):`);
        for (const update of updates) {
          console.log(
            chalk.cyan(`  ${update.name}: `) +
            chalk.gray(`${update.currentVersion} → `) +
            chalk.green(update.availableVersion)
          );
        }
        
        // Sync rulesets
        spinner.start("Syncing rulesets...");
        
        const result = await manager.syncInstalledRulesets({
          preserveLocal: options.preserveLocal || !options.force,
          only: rulesets.length > 0 ? rulesets : undefined
        });
        
        // Report results
        if (result.updated.length > 0) {
          spinner.succeed(
            chalk.green(`Updated ${result.updated.length} ruleset(s): `) +
            result.updated.join(", ")
          );
        }
        
        if (result.preserved && result.preserved.length > 0) {
          console.log(
            chalk.blue("Preserved local modifications for: ") +
            result.preserved.join(", ")
          );
        }
        
        if (result.conflicts && result.conflicts.length > 0) {
          console.log(
            chalk.yellow("\n⚠️  Conflicts detected for: ") +
            result.conflicts.join(", ")
          );
          console.log(
            chalk.gray("Check .rulesets/conflicts/ for details")
          );
        }
        
        if (result.failed.length > 0) {
          console.log(
            chalk.red("Failed to update: ") +
            result.failed.join(", ")
          );
        }
        
      } catch (error: any) {
        spinner.fail(chalk.red(`Sync failed: ${error.message}`));
        process.exit(1);
      }
    });
}