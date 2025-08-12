# Rulesets Production-Ready Enhancement Plan
*Execution Date: 2025-01-12*

## Overview
Transform Rulesets v0 into a production-ready system with comprehensive provider support, configuration management, and .gitignore automation.

## Success Criteria
- ✅ Clean builds without type errors
- ✅ Automatic .gitignore management with override mechanisms
- ✅ Configuration file support (JSONC/TOML)
- ✅ 4 new providers: Claude Code, Codex, Amp, OpenCode
- ✅ All providers properly typed and tested
- ✅ Comprehensive integration testing

## Phase 1: Foundation (Sequential Execution)

### Task 1.1: Fix Parser Type Errors
**Agent**: type-safety-enforcer
**Priority**: BLOCKING - must complete before other work
**Deliverables**:
- Fix type errors in `packages/parser/src/parser-with-brands.ts`
- Ensure clean `bun run build` across all packages
- Update type definitions as needed

**Acceptance Criteria**:
- `turbo build` completes without errors
- All TypeScript type checks pass
- No breaking changes to public APIs

### Task 1.2: Type System Validation
**Agent**: type-safety-enforcer
**Dependencies**: Task 1.1
**Deliverables**:
- Validate all existing provider types
- Ensure strict typing compliance
- Document type system improvements

## Phase 2: Core Infrastructure (Parallel Execution)

### Task 2.1: .gitignore Management System
**Agent**: senior-engineer
**Dependencies**: Task 1.1
**Deliverables**:
- Automatic .gitignore management for generated files
- Support for `.rulesekeep` override file
- Support for `.rulesetignore` override file
- Configuration-based gitignore control

**Technical Specifications**:
```typescript
interface GitignoreManager {
  updateGitignore(generatedPaths: string[]): Promise<void>;
  readOverrides(): Promise<GitignoreOverrides>;
  shouldIgnore(path: string): boolean;
}

interface GitignoreOverrides {
  keep: string[];      // from .rulesekeep
  ignore: string[];    // from .rulesetignore
  config: string[];    // from config file
}
```

**File Structure**:
- `.rulesekeep` - paths to keep in git (override default ignoring)
- `.rulesetignore` - additional paths to ignore
- Managed block in `.gitignore` with marker comments

### Task 2.2: Configuration File System
**Agent**: systems-architect
**Dependencies**: Task 1.1
**Deliverables**:
- `ruleset.config.jsonc` support (preferred)
- `ruleset.config.toml` support (alternative)
- Configuration schema validation
- Runtime configuration loading

**Configuration Schema**:
```jsonc
{
  // Provider settings
  "providers": {
    "cursor": { "enabled": true, "outputPath": ".cursor/rules/" },
    "claude-code": { "enabled": true, "outputPath": "CLAUDE.md" }
  },
  
  // Gitignore management
  "gitignore": {
    "enabled": true,
    "keep": ["specific-file.md"],
    "ignore": ["*.backup"]
  },
  
  // Global settings
  "defaultProviders": ["cursor", "claude-code"],
  "strict": true
}
```

## Phase 3: Provider Implementation (Parallel Execution)

### Task 3.1: Claude Code Provider
**Agent**: senior-engineer
**Dependencies**: Task 1.1, Task 2.2
**Deliverables**:
- `ClaudeCodeProvider` class implementing `Provider` interface
- Output to `CLAUDE.md` file
- MCP configuration support via `.mcp.json`
- Full type safety and validation

**Technical Specifications**:
```typescript
export class ClaudeCodeProvider implements Provider {
  readonly id: ProviderId = createProviderId('claude-code');
  readonly version: Version = createVersion('1.0.0');
  readonly description = 'Claude Code CLI assistant';
  readonly website = 'https://docs.anthropic.com/en/docs/claude-code';
  readonly type = 'cli' as const;
  
  readonly config: ProviderConfig = {
    outputPath: createOutputPath('CLAUDE.md'),
    format: 'markdown',
    fileNaming: 'fixed',
  };
}
```

### Task 3.2: Codex Provider
**Agent**: senior-engineer
**Dependencies**: Task 1.1, Task 2.2
**Deliverables**:
- `CodexProvider` class implementing `Provider` interface
- Output to `AGENTS.md` file
- MCP configuration support via `.codex/config.toml`
- Environment variable configuration support

### Task 3.3: Amp Provider
**Agent**: senior-engineer
**Dependencies**: Task 1.1, Task 2.2
**Deliverables**:
- `AmpProvider` class implementing `Provider` interface
- Output to `AGENT.md` file
- Simple file-based configuration

### Task 3.4: OpenCode Provider
**Agent**: senior-engineer
**Dependencies**: Task 1.1, Task 2.2
**Deliverables**:
- `OpenCodeProvider` class implementing `Provider` interface
- Output to `AGENTS.md` file
- MCP configuration support via `opencode.json`
- Global config support via `~/.config/opencode/opencode.json`

## Phase 4: Integration & Testing (Sequential Execution)

### Task 4.1: Comprehensive Testing
**Agent**: test-driven-developer
**Dependencies**: All Phase 3 tasks
**Deliverables**:
- Unit tests for all new providers
- Integration tests for config system
- End-to-end testing scenarios
- Performance regression testing

### Task 4.2: Code Review & Quality
**Agent**: code-reviewer
**Dependencies**: Task 4.1
**Deliverables**:
- Comprehensive code review of all implementations
- Security audit of file operations
- Performance analysis and optimization recommendations
- Documentation review and updates

## Agent Coordination Protocol

### Communication
- Each agent logs progress to `.agent/logs/[agent-name]-[timestamp].log`
- Blocking issues are escalated immediately
- Dependencies are validated before starting work

### Quality Gates
- All code must pass type checking
- All new features require tests
- Security review required for file system operations
- Performance impact assessment for new features

## Risk Mitigation

### High Risk Items
1. **Parser type errors** - Could block entire effort
   - Mitigation: Address in Phase 1 with type-safety specialist
2. **Provider compatibility** - New providers might conflict
   - Mitigation: Incremental testing and validation
3. **Configuration complexity** - JSONC/TOML support adds complexity
   - Mitigation: Use proven libraries, comprehensive testing

### Success Metrics
- Clean build completion time < 30 seconds
- All 6 providers (existing + new) functional
- Configuration system supports both formats
- .gitignore automation works across different project structures