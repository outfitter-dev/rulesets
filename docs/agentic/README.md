# Agentic-Driven Development for Rulesets

## Overview

Rulesets is being developed using an **agentic-driven development approach** where AI agents are primary contributors to the codebase. This document tracks our multi-agent strategy, tooling, and best practices for coordinating AI-driven development.

## Supported AI Agents

### Primary Agents

| Agent              | Type          | Integration Status | Primary Use Cases                           |
| ------------------ | ------------- | ------------------ | ------------------------------------------- |
| **Claude Code**    | CLI           | ✅ Active          | Planning, architecture, complex refactoring |
| **GitHub Copilot** | IDE Extension | ✅ Configured      | Code completion, inline suggestions         |
| **Google Jules**   | Web Agent     | ✅ Configured      | Autonomous feature implementation           |
| **OpenAI Codex**   | CLI/Agent     | ✅ Configured      | Code generation, completion via AGENTS.md   |

### Secondary Agents

| Agent                  | Type              | Integration Status | Primary Use Cases                |
| ---------------------- | ----------------- | ------------------ | -------------------------------- |
| **Cursor**             | IDE               | 🟡 Planned         | Interactive development sessions |
| **Windsurf**           | IDE               | 🟡 Planned         | AI-assisted coding workflows     |
| **Cline**              | VS Code Extension | 🟡 Planned         | Local development assistance     |
| **OpenAI Codex CLI**   | CLI               | 🟡 Planned         | Command-line code generation     |
| **OpenAI Codex Agent** | Web Agent         | 🟡 Planned         | Web-based autonomous development |

## Agent Configuration Files

### Universal Instructions

- **`AGENTS.md`** - Master AI agent guidance document
- **`docs/project/LANGUAGE.md`** - Consistent terminology across agents

### Agent-Specific Instructions

- **`CLAUDE.md`** - Claude Code project-specific guidance
- **`AGENTS.md`** - OpenAI Codex and general AI agent instructions
- **`.github/copilot-instructions.md`** - GitHub Copilot repository instructions
- **`docs/agentic/jules/`** - Google Jules agent documentation suite


## Development Workflow

### Phase-Based Agent Assignment

#### Planning & Architecture (Claude Code)

- Strategic planning and documentation
- Architecture decisions and interface design
- Complex refactoring tasks
- Cross-cutting concerns and system design

#### Feature Implementation (Google Jules)

- Autonomous feature development
- End-to-end implementation tasks
- Integration testing and validation
- Bug fixes and maintenance tasks

#### Code Enhancement (GitHub Copilot)

- Real-time code completion and suggestions
- Inline documentation assistance
- Pattern-based code generation
- Routine coding tasks and boilerplate

#### General AI Development (OpenAI Codex)

- Code generation via standard AGENTS.md instructions
- CLI-based development assistance
- Web agent autonomous development (planned)
- Flexible integration with various tools and platforms

### Coordination Strategy

1. **Planning Phase**

   - Claude Code creates implementation plans
   - Scope and requirements are clearly defined

2. **Implementation Phase**

   - Jules executes autonomous development tasks
   - Copilot assists with code completion and patterns
   - All agents follow established conventions

3. **Review Phase**
   - Automated testing validates implementations
   - Documentation stays synchronized with code

## Quality Assurance

### Automated Validation

```bash
# All agents must ensure these pass
bun turbo test      # Unit and integration tests
bun turbo lint      # Code style and quality
bun turbo build     # TypeScript compilation
bun turbo typecheck # Type safety validation
```

### Code Standards Enforcement

- **TLDR Comments**: Every function has clear purpose documentation
- **Consistent Terminology**: All agents use `docs/project/LANGUAGE.md` spec
- **Test Coverage**: Every implementation includes comprehensive tests
- **Documentation**: Changes update relevant documentation automatically

## Agent Communication Patterns

### Cross-Agent References

- Agents reference shared documentation consistently
- Implementation plans guide autonomous development
- Clear documentation enables progress tracking across agents

## Success Metrics

### Development Velocity

- **Feature Completion Rate**: Autonomous implementations per sprint
- **Code Quality Metrics**: Test coverage, linting compliance
- **Documentation Synchronization**: Docs updated with code changes

### Agent Effectiveness

- **Task Success Rate**: Successful autonomous completions
- **Documentation Quality**: Consistent and clear documentation
- **Cross-Agent Coordination**: Smooth handoffs between agents

## Best Practices

### For Human Developers

1. **Always specify agent context** in task descriptions
2. **Maintain consistent documentation** in manual code changes
3. **Update agent documentation** when changing project structure
4. **Review agent outputs** for quality compliance

### For AI Agents

1. **Reference documentation first** before implementing
2. **Use search tools extensively** for code discovery
3. **Include clear comments** in all code
4. **Follow established patterns** from existing codebase

## Current Implementation Status

### Rulesets v0 (Active)

- **Scope**: Basic parser, pass-through compiler, stub plugins
- **Primary Agent**: Google Jules for implementation
- **Supporting Agent**: GitHub Copilot for code assistance
- **Planning Agent**: Claude Code for architecture

### Future Versions

- **v0.1**: Block parsing and processing
- **v0.2**: Variable substitution and imports
- **v1.0**: Complete Ruleset syntax support

## Troubleshooting

### Agent Coordination Issues

- **Inconsistent documentation**: Check agent configuration files
- **Missing documentation**: Update relevant agent instruction files
- **Test failures**: Ensure all agents run validation commands

### Performance Optimization

- **Slow agent responses**: Review prompt complexity and context size
- **Repetitive tasks**: Create better prompts and examples
- **Quality issues**: Enhance agent instruction documentation

## Resources

### Agent Documentation

- `AGENTS.md` - Master AI agent guide (used by OpenAI Codex agents)
- `docs/agentic/jules/` - Google Jules integration
- `.github/copilot-instructions.md` - GitHub Copilot setup

### Project Context

- `docs/project/LANGUAGE.md` - Terminology specifications
- `docs/project/plans/PLAN-rulesets-v0.md` - Current implementation plan

### Development Standards

- `CLAUDE.md` - Project concepts and workflow
- TypeScript configuration with strict settings
- Conventional commit messages and PR guidelines

---

This agentic development approach enables rapid, coordinated development while maintaining code quality and project consistency through shared conventions and automated tooling.
