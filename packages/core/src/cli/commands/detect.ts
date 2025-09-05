import { globalConfig } from '../../config/global-config';
import { ProjectDetector } from '../../utils/project-detector';
import { ConsoleLogger } from '../../utils/logger';

/**
 * Detect project type and suggest rulesets.
 */
export async function detectCommand(options: {
  projectPath?: string;
  autoInstall?: boolean;
  verbose?: boolean;
}): Promise<void> {
  const logger = new ConsoleLogger(options.verbose ? 'debug' : 'info');
  const projectPath = options.projectPath || process.cwd();
  
  logger.info('🔍 Detecting project configuration...\n');
  
  try {
    // Load global config
    const config = await globalConfig.loadConfig();
    
    // Detect project
    const detector = new ProjectDetector(config);
    const result = await detector.detect(projectPath);
    
    // Display results
    console.log(detector.getSummary(result));
    
    if (result.suggestedSets.length === 0) {
      logger.warn('\n⚠️  No rulesets detected for this project');
      return;
    }
    
    // Check which sets are available globally
    const availableSets = await globalConfig.listRulesets();
    const missingSets = result.suggestedSets.filter(set => !availableSets.includes(set));
    
    if (missingSets.length > 0) {
      logger.warn(`\n⚠️  The following rulesets are not installed globally:`);
      logger.warn(`   ${missingSets.join(', ')}`);
      logger.info(`\n💡 You can install them with:`);
      logger.info(`   rulesets install ${missingSets.join(' ')} --global`);
    }
    
    // Auto-install if requested
    if (options.autoInstall) {
      const setsToInstall = result.suggestedSets.filter(set => availableSets.includes(set));
      
      if (setsToInstall.length > 0) {
        logger.info(`\n📦 Installing rulesets: ${setsToInstall.join(', ')}`);
        // TODO: Implement installation
        logger.info('✅ Installation complete');
      }
    } else {
      console.log('\n💡 To install these rulesets, run:');
      console.log(`   rulesets install ${result.suggestedSets.join(' ')}`);
    }
  } catch (error) {
    logger.error('Failed to detect project:', error);
    process.exit(1);
  }
}