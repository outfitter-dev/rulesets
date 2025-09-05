import { GlobalConfig } from '../../config/global-config';
import { ProjectDetector } from '../../detection/project-detector';
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
    const globalConfig = new GlobalConfig();
    const config = await globalConfig.load();
    
    // Detect project
    const detector = new ProjectDetector(config);
    const result = await detector.detect(projectPath);
    
    // Display results
    const summary = `
📁 Project Type: ${result.projectType.join(', ')}
📦 Dependencies: ${result.detectedDependencies.slice(0, 5).join(', ')}${result.detectedDependencies.length > 5 ? '...' : ''}
🎯 Suggested Rulesets: ${result.suggestedSets.join(', ')}
`;
    console.log(summary);
    
    if (result.suggestedSets.length === 0) {
      logger.warn('\n⚠️  No rulesets detected for this project');
      return;
    }
    
    // For now, assume all suggested sets could be available
    const missingSets: string[] = [];
    
    if (missingSets.length > 0) {
      logger.warn(`\n⚠️  The following rulesets are not installed globally:`);
      logger.warn(`   ${missingSets.join(', ')}`);
      logger.info(`\n💡 You can install them with:`);
      logger.info(`   rulesets install ${missingSets.join(' ')} --global`);
    }
    
    // Auto-install if requested
    if (options.autoInstall) {
      // For now, install all suggested sets
      const setsToInstall = result.suggestedSets;
      
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