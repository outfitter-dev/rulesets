// Example demonstrating the Amp provider usage
// This shows how to programmatically use the Amp provider

import { AmpProvider } from '../src/providers/amp-provider';
import type { CompiledDoc, Logger } from '@rulesets/types';

// Simple example of using the Amp provider
async function exampleAmpUsage() {
  const provider = new AmpProvider();
  
  // Mock logger for this example
  const logger: Logger = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
    debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  };

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

  console.log('🚀 Amp Provider Example');
  console.log('========================');
  
  // Display provider information
  console.log(`Provider ID: ${provider.id}`);
  console.log(`Provider Name: ${provider.name}`);
  console.log(`Provider Type: ${provider.type}`);
  console.log(`Output Path: ${provider.config.outputPath}`);
  console.log(`Format: ${provider.config.format}`);
  console.log(`File Naming: ${provider.config.fileNaming}`);
  
  console.log('\n📋 Provider Capabilities:');
  console.log(`Supports Blocks: ${provider.capabilities.supportsBlocks}`);
  console.log(`Supports Imports: ${provider.capabilities.supportsImports}`);
  console.log(`Supports Variables: ${provider.capabilities.supportsVariables}`);
  console.log(`Supports XML: ${provider.capabilities.supportsXml}`);
  console.log(`Supports Markdown: ${provider.capabilities.supportsMarkdown}`);
  console.log(`Max File Size: ${provider.capabilities.maxFileSize} bytes`);
  console.log(`Allowed Formats: ${provider.capabilities.allowedFormats.join(', ')}`);

  console.log('\n⚙️  Configuration Schema:');
  const schema = provider.configSchema();
  console.log('Schema type:', schema.type);
  console.log('Available properties:', Object.keys(schema.properties || {}));

  // In a real scenario, you would use the write method like this:
  console.log('\n📝 Example Write Operation:');
  console.log('(Simulated - would write to AGENT.md)');
  
  try {
    console.log('Content preview:');
    console.log('================');
    console.log(compiledDoc.output.content.substring(0, 200) + '...');
    console.log(`\nTotal content length: ${compiledDoc.output.content.length} characters`);
    
    // Note: In real usage, this would actually write to disk
    // const result = await provider.write({
    //   compiled: compiledDoc,
    //   destPath: '/path/to/output',
    //   config: { outputPath: 'AGENT.md' },
    //   logger,
    // });
    
    console.log('\n✅ Example completed successfully!');
    console.log('In real usage, this would create AGENT.md in your project root.');
    
  } catch (error) {
    console.error('\n❌ Error in example:', error);
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  exampleAmpUsage().catch(console.error);
}

export { exampleAmpUsage };