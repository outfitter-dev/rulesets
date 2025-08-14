/**
 * Parser implementation using branded types
 * This demonstrates how to integrate the new type system
 */

import {
  type Block,
  BrandValidationError,
  createBlockName,
  createMarkerContent,
  createPropertyName,
  createRawContent,
  createSourcePath,
  createVariableName,
  type Import,
  type Marker,
  type ParsedDocument,
  type ParseError,
  type ParserContext,
  type PropertyName,
  type RawContent,
  type SourcePath,
  type Variable,
} from '@rulesets/types';

/**
 * Enhanced parser with branded types
 */
export class BrandedParser {
  private errors: ParseError[] = [];

  /**
   * Parse with context - recommended approach
   */
  parseWithContext(context: ParserContext): ParsedDocument {
    this.errors = [];

    const { rawContent, sourcePath, frontmatter } = context;

    // Extract AST elements with validation
    const blocks = this.extractBlocks(rawContent);
    const imports = this.extractImports(rawContent);
    const variables = this.extractVariables(rawContent);
    const markers = this.extractMarkers(rawContent);

    return {
      source: {
        path: sourcePath,
        content: rawContent,
        frontmatter,
      },
      ast: {
        blocks,
        imports,
        variables,
        markers,
      },
      errors: this.errors.length > 0 ? this.errors : undefined,
    };
  }

  /**
   * Legacy parse method with validation
   */
  parse(content: string, sourcePath?: string): ParsedDocument {
    this.errors = [];

    // Validate and brand inputs
    let validPath: SourcePath;
    let validContent: RawContent;

    try {
      validPath = sourcePath
        ? createSourcePath(sourcePath)
        : createSourcePath('unknown.md');
    } catch (err) {
      if (err instanceof BrandValidationError) {
        this.addError(`Invalid source path: ${err.message}`, 0, 0, 'error');
        validPath = createSourcePath('unknown.md');
      } else {
        throw err;
      }
    }

    try {
      validContent = createRawContent(content);
    } catch (err) {
      if (err instanceof BrandValidationError) {
        throw new Error(`Content validation failed: ${err.message}`);
      }
      throw err;
    }

    // Extract frontmatter
    const frontmatter = this.extractFrontmatter(validContent);

    // Extract AST elements
    const blocks = this.extractBlocks(validContent);
    const imports = this.extractImports(validContent);
    const variables = this.extractVariables(validContent);
    const markers = this.extractMarkers(validContent);

    return {
      source: {
        path: validPath,
        content: validContent,
        frontmatter,
      },
      ast: {
        blocks,
        imports,
        variables,
        markers,
      },
      errors: this.errors.length > 0 ? this.errors : undefined,
    };
  }

  /**
   * Extract blocks with validation
   */
  private extractBlocks(content: RawContent): Block[] {
    const blocks: Block[] = [];
    const blockRegex = /\{\{([^}]+)\}\}/g;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: Standard pattern for regex exec in while loop
    while ((match = blockRegex.exec(content)) !== null) {
      const innerContent = match[1]; // Guaranteed by regex pattern [^}]+
      if (!innerContent) {
        continue; // Extra safety check
      }

      const line = this.getLineNumber(content, match.index);
      const column = this.getColumnNumber(content, match.index);

      // Check if it's a block marker
      if (this.isBlockMarker(innerContent)) {
        try {
          const { name, properties, isClosing } =
            this.parseBlockMarker(innerContent);

          // Validate inputs before branding
          if (!name) {
            this.addError(
              'Block marker missing name',
              line,
              column,
              'error',
              'MISSING_BLOCK_NAME'
            );
            continue;
          }

          // Validate and brand the block name
          const validName = createBlockName(name);
          const validContent = createMarkerContent(innerContent);

          blocks.push({
            name: validName,
            content: validContent,
            properties,
            line,
            column,
            isClosing,
          });
        } catch (err) {
          if (err instanceof BrandValidationError) {
            this.addError(
              `Invalid block: ${err.message}`,
              line,
              column,
              'error',
              'INVALID_BLOCK'
            );
          }
        }
      }
    }

    return blocks;
  }

  /**
   * Extract imports with validation
   */
  private extractImports(content: RawContent): Import[] {
    const imports: Import[] = [];
    const importRegex = /\{\{>\s*([^}]+)\}\}/g;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: Standard pattern for regex exec in while loop
    while ((match = importRegex.exec(content)) !== null) {
      const innerContent = match[1]?.trim();
      if (!innerContent) {
        continue; // Skip empty imports
      }

      const line = this.getLineNumber(content, match.index);
      const column = this.getColumnNumber(content, match.index);

      try {
        const { path, blockName, properties } = this.parseImport(innerContent);

        imports.push({
          path,
          blockName: blockName ? createBlockName(blockName) : undefined,
          properties,
          line,
          column,
        });
      } catch (err) {
        if (err instanceof BrandValidationError) {
          this.addError(
            `Invalid import: ${err.message}`,
            line,
            column,
            'error',
            'INVALID_IMPORT'
          );
        }
      }
    }

    return imports;
  }

  /**
   * Extract variables with validation
   */
  private extractVariables(content: RawContent): Variable[] {
    const variables: Variable[] = [];
    const varRegex = /\{\{\$([^}]+)\}\}/g;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: Standard pattern for regex exec in while loop
    while ((match = varRegex.exec(content)) !== null) {
      const varContent = match[1]?.trim();
      if (!varContent) {
        continue; // Skip empty variables
      }

      const line = this.getLineNumber(content, match.index);
      const column = this.getColumnNumber(content, match.index);

      try {
        const { name, fallback, isSystem } = this.parseVariable(varContent);
        if (!name) {
          this.addError(
            'Variable missing name',
            line,
            column,
            'error',
            'MISSING_VARIABLE_NAME'
          );
          continue;
        }
        const validName = createVariableName(name);

        variables.push({
          name: validName,
          value: fallback,
          isSystem,
          line,
          column,
        });
      } catch (err) {
        if (err instanceof BrandValidationError) {
          this.addError(
            `Invalid variable: ${err.message}`,
            line,
            column,
            'warning',
            'INVALID_VARIABLE'
          );
        }
      }
    }

    return variables;
  }

  /**
   * Extract all markers generically
   */
  private extractMarkers(content: RawContent): Marker[] {
    const markers: Marker[] = [];
    const markerRegex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = markerRegex.exec(content)) !== null) {
      const innerContent = match[1];
      if (!innerContent) {
        continue; // Skip empty markers
      }

      const line = this.getLineNumber(content, match.index);
      const column = this.getColumnNumber(content, match.index);

      try {
        const validContent = createMarkerContent(innerContent);
        const type = this.detectMarkerType(innerContent);

        markers.push({
          type,
          content: validContent,
          line,
          column,
        });
      } catch (err) {
        if (err instanceof BrandValidationError) {
          // Skip invalid markers - they're not included in the result
          continue;
        }
        // Re-throw unexpected errors
        throw err;
      }
    }

    return markers;
  }

  /**
   * Parse block marker details
   */
  private parseBlockMarker(content: string): {
    name: string;
    properties: Array<{ name: PropertyName; value?: string }>;
    isClosing: boolean;
  } {
    const isClosing = content.startsWith('/');
    const cleanContent = isClosing ? content.slice(1) : content;
    const parts = cleanContent.split(/\s+/).filter((part) => part.length > 0);
    const name = parts[0] || '';

    // Parse properties
    const properties: Array<{ name: PropertyName; value?: string }> = [];
    for (let i = 1; i < parts.length; i++) {
      const prop = parts[i];
      if (!prop) {
        continue;
      }

      if (prop.includes('=')) {
        const [propName, propValue] = prop.split('=');
        if (propName) {
          try {
            properties.push({
              name: createPropertyName(propName),
              value: propValue,
            });
          } catch {
            // Skip invalid properties
          }
        }
      } else {
        try {
          properties.push({
            name: createPropertyName(prop),
          });
        } catch {
          // Skip invalid properties
        }
      }
    }

    return { name, properties, isClosing };
  }

  /**
   * Parse import details
   */
  private parseImport(content: string): {
    path: string;
    blockName?: string;
    properties: Array<{ name: PropertyName; value?: string }>;
  } {
    const parts = content.split(/\s+/).filter((part) => part.length > 0);
    let path = parts[0] || '';
    let blockName: string | undefined;

    // Check for block selector
    if (path?.includes('#')) {
      const [basePath, selector] = path.split('#');
      path = basePath || '';
      blockName = selector;
    }

    // Parse properties (everything after the path)
    const properties: Array<{ name: PropertyName; value?: string }> = [];
    for (let i = 1; i < parts.length; i++) {
      const prop = parts[i];
      if (!prop) {
        continue;
      }

      if (prop.includes('=')) {
        const [propName, propValue] = prop.split('=');
        if (propName) {
          try {
            properties.push({
              name: createPropertyName(propName),
              value: propValue,
            });
          } catch {
            // Skip invalid properties
          }
        }
      }
    }

    return { path, blockName, properties };
  }

  /**
   * Parse variable details
   */
  private parseVariable(content: string): {
    name: string;
    fallback?: string;
    isSystem: boolean;
  } {
    // Check for fallback syntax: $var || "default"
    let name = content;
    let fallback: string | undefined;

    if (content.includes('||')) {
      const parts = content.split('||').map((s) => s.trim());
      const varName = parts[0];
      const defaultValue = parts[1];
      if (varName) {
        name = varName;
        if (defaultValue) {
          fallback = defaultValue.replace(/^["']|["']$/g, ''); // Remove quotes
        }
      }
    }

    // Add $ prefix if not present (for the branded type)
    if (!name.startsWith('$')) {
      name = `$${name}`;
    }

    // Check if it's a system variable
    const systemVars = ['$destination', '$file', '$alias', '$version'];
    const isSystem = systemVars.includes(name);

    return { name, fallback, isSystem };
  }

  /**
   * Extract frontmatter
   */
  private extractFrontmatter(
    content: RawContent
  ): Record<string, unknown> | undefined {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return;
    }

    try {
      // In real implementation, use a YAML parser
      // This is simplified for demonstration
      const yamlContent = match[1];
      if (!yamlContent) {
        return;
      }

      const frontmatter: Record<string, unknown> = {};

      // Basic parsing (replace with proper YAML parser)
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const trimmedKey = key?.trim();
          if (trimmedKey) {
            const value = valueParts.join(':').trim();
            frontmatter[trimmedKey] = value;
          }
        }
      }

      return frontmatter;
    } catch {
      this.addError('Invalid frontmatter', 1, 0, 'warning');
      return;
    }
  }

  /**
   * Detect marker type - aligns with ruleset-context.ts Marker type
   */
  private detectMarkerType(content: string): Marker['type'] {
    if (content.startsWith('>')) {
      return 'import';
    }
    if (content.startsWith('$')) {
      return 'variable';
    }
    if (content.includes('{') || content.includes('}')) {
      return 'raw';
    }
    return 'block';
  }

  /**
   * Check if content is a block marker
   */
  private isBlockMarker(content: string): boolean {
    // Block markers don't start with special characters (except /)
    const specialStarts = ['>', '$', '!', '#', '@'];
    const trimmed = content.trim();

    if (trimmed.startsWith('/')) {
      // Closing block
      return true;
    }

    return !specialStarts.some((char) => trimmed.startsWith(char));
  }

  /**
   * Get line number for position
   */
  private getLineNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  /**
   * Get column number for position
   */
  private getColumnNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    const lastLine = lines.at(-1);
    return (lastLine?.length ?? 0) + 1;
  }

  /**
   * Add parse error
   */
  private addError(
    message: string,
    line: number,
    column: number,
    severity: 'error' | 'warning' | 'info',
    code?: string
  ): void {
    this.errors.push({
      message,
      line,
      column,
      severity,
      code,
    });
  }
}

/**
 * Export a default instance for backwards compatibility
 */
export const brandedParser = new BrandedParser();

/**
 * Legacy export for compatibility
 */
export function parse(content: string, sourcePath?: string): ParsedDocument {
  return brandedParser.parse(content, sourcePath);
}

/**
 * New context-based export (recommended)
 */
export function parseWithContext(context: ParserContext): ParsedDocument {
  return brandedParser.parseWithContext(context);
}
