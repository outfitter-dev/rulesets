// Example demonstrating the Amp provider usage
// This shows how to programmatically use the Amp provider

import type { CompiledDoc } from '@rulesets/types';
import { AmpProvider } from '../src/providers/amp-provider';
import { createLogger } from '../src/utils/logger';

// Simple example of using the Amp provider
function exampleAmpUsage() {
  const provider = new AmpProvider();

  // Create a proper logger using pino
  const pinoLogger = createLogger({ name: 'amp-example', level: 'debug' });
  // const logger = toRulesetsLogger(pinoLogger); // Available if needed for provider operations

  // Example compiled document (in real usage, this comes from the compiler)
  const compiledDoc: CompiledDoc = {
    output: {
      content: `# AI Assistant Rules

## Instructions

You are a helpful coding assistant for this TypeScript project.

### Core Principles
- Write clean, maintainable code
- Follow TypeScript best practices
- Prioritize code safety and readability
- Use meaningful variable and function names

### Code Style
- Use 2-space indentation
- Prefer \`const\` over \`let\` when possible
- Use explicit return types for functions
- Add JSDoc comments for public APIs

## Examples

\`\`\`typescript
// ✅ Good: Explicit types and clear naming
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

async function getUserById(id: string): Promise<User | null> {
  return await database.user.findUnique({ where: { id } });
}
\`\`\`

\`\`\`typescript
// ❌ Avoid: Implicit types and unclear naming
async function get(id) {
  return await db.user.findUnique({ where: { id } });
}
\`\`\`

## Project Context

This is a modern TypeScript web application using:
- Node.js runtime
- TypeScript for type safety
- Express.js for API routes
- Prisma for database access
- Jest for testing
`,
      metadata: {
        priority: 'high',
        includeProjectContext: true,
      },
    },
  };

  pinoLogger.info('🚀 Amp Provider Example');
  pinoLogger.info('========================');

  // Display provider information
  pinoLogger.info({ providerId: provider.id }, 'Provider ID');
  pinoLogger.info({ providerName: provider.name }, 'Provider Name');
  pinoLogger.info({ providerType: provider.type }, 'Provider Type');
  pinoLogger.info({ outputPath: provider.config.outputPath }, 'Output Path');
  pinoLogger.info({ format: provider.config.format }, 'Format');
  pinoLogger.info({ fileNaming: provider.config.fileNaming }, 'File Naming');

  pinoLogger.info('📋 Provider Capabilities:');
  pinoLogger.info({ capabilities: provider.capabilities }, 'Provider capabilities');

  pinoLogger.info('⚙️  Configuration Schema:');
  const schema = provider.configSchema();
  pinoLogger.info({ schemaType: schema.type, properties: Object.keys(schema.properties || {}) }, 'Schema configuration');

  // In a real scenario, you would use the write method like this:
  pinoLogger.info('📝 Example Write Operation:');
  pinoLogger.info('(Simulated - would write to AGENT.md)');

  try {
    pinoLogger.info('Content preview:');
    pinoLogger.info('================');
    pinoLogger.info({ preview: `${compiledDoc.output.content.substring(0, 200)}...` }, 'Content preview');
    pinoLogger.info(
      { contentLength: compiledDoc.output.content.length },
      'Total content length in characters'
    );

    // Note: In real usage, this would actually write to disk
    // const result = await provider.write({
    //   compiled: compiledDoc,
    //   destPath: '/path/to/output',
    //   config: { outputPath: 'AGENT.md' },
    //   logger,
    // });

    pinoLogger.info('✅ Example completed successfully!');
    pinoLogger.info(
      'In real usage, this would create AGENT.md in your project root.'
    );
  } catch (error) {
    pinoLogger.error({ error }, '❌ Error in example');
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  exampleAmpUsage();
}

export { exampleAmpUsage };
