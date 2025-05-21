// TLDR: Defines the CompiledDoc interface for Mixdown output (mixd-v0)

export interface Stem {
  name: string;
}

export interface Import {
  path: string;
}

export interface Variable {
  name: string;
}

export interface Marker {
  type: 'stem' | 'import' | 'variable' | 'unknown';
}

export interface ParsedDoc {
  source: {
    path?: string;
    content: string;
    frontmatter?: Record<string, any>;
  };
  ast: {
    stems: Stem[];
    imports: Import[];
    variables: Variable[];
    markers: Marker[];
  };
  errors?: Array<{ message: string; line?: number; column?: number }>;
}

export interface CompiledDoc {
  source: {
    path?: string;
    content: string;
    frontmatter?: Record<string, any>;
  };
  ast: {
    stems: Stem[];
    imports: Import[];
    variables: Variable[];
    markers: Marker[];
  };
  output: {
    content: string;
    metadata?: Record<string, any>;
  };
  context: {
    destinationId: string;
    config: Record<string, any>;
  };
}
