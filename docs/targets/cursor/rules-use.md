# Cursor Rules System

Cursor uses Markdown files with YAML front-matter (`.mdc` extension) organized in rules directories to guide the AI assistant, providing persistent context and instructions that shape the assistant's behavior.

## Key Features

- **Rule Types:** Always Apply, Auto-Attached (via globs), Agent-Requested, Manual
- **Nested Rules:** Supports `.cursor/rules/` directories in subdirectories (v0.50+)
- **Prompt Integration:** Shows which rules are active in the context panel
- **YAML Front-matter:** Controls rule behavior with structured metadata
- **UI Integration:** Rules can be managed directly from the Cursor interface
- **File Referencing:** Supports `@filename` syntax to include external file content
- **Character Limits:** Recommended to keep each rule under ~500 lines for optimal performance

## Directory Structure

```text
project/
├── .cursor/                       # Project root rules
│   └── rules/
│       ├── always-style.mdc        # alwaysApply: true in YAML front-matter
│       └── api-conventions.mdc     # globs: ["**/api/**"] in YAML front-matter
├── frontend/
│   ├── .cursor/                  # Subdirectory-specific rules
│   │   └── rules/
│   │       └── react-standards.mdc  # Only loaded when working in frontend/
└── ...
```

## Rule Locations and Scope

- **User Rules (Global):** Configured via Cursor Settings > "Rules for AI" in the UI, apply to all projects
- **Project Rules:** Stored in `.cursor/rules/` at the project root, apply only within that project
- **Nested Rules:** Stored in `.cursor/rules/` directories in subdirectories, apply only to files in those subdirectories
- **Legacy Support:** `.cursorrules` file at project root (deprecated, but still supported)

## YAML Front-matter Example

```yaml
---
description: React Component Standards  
globs: ["**/components/**/*.tsx"]
alwaysApply: false
---
# React Component Guidelines
- Use functional components with hooks
- Follow naming pattern: ComponentName.tsx
```

## Rule Types and Activation

1. **Always Apply**: Rules that are always included in context for every operation
   ```yaml
   ---
   alwaysApply: true
   ---
   ```

2. **Auto-Attached**: Rules that apply only when working with matching files
   ```yaml
   ---
   globs: ["**/*.py", "**/*.ipynb"]
   ---
   ```

3. **Agent-Requested**: Rules that are only added when the AI specifically requests them
   ```yaml
   ---
   description: "Database Schema"
   ---
   ```

4. **Manual**: Rules that are only applied when manually selected by the user
   ```yaml
   ---
   # No special metadata - will only be used when explicitly referenced
   ---
   ```

## Nested Rules Feature (v0.50+, May 2025)

Cursor supports nested rule directories with automatic scoping:

- Place `.cursor/rules/` folders anywhere in your project tree
- Rules are loaded based on file relevance:
  - Root-level rules always checked first
  - Subdirectory rules only loaded when working with files in that path
  - Deeper nested rules triggered only when their specific files are involved

```mermaid
flowchart TD
    A[project/] --> B[.cursor/rules/]
    A --> C[apps/]
    A --> D[packages/]
    
    C --> E[api/]
    C --> F[web/]
    D --> G[utils/]
    
    E --> E1[.cursor/rules/]
    F --> F1[.cursor/rules/]
    G --> G1[.cursor/rules/]
    
    B --> B1[project-wide rules]
    E1 --> E2[api-specific rules]
    F1 --> F2[web-specific rules]
    G1 --> G2[utils-specific rules]
    
    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
    style E1 fill:#dfd,stroke:#333
    style F1 fill:#dfd,stroke:#333
    style G1 fill:#dfd,stroke:#333
```

## Rule Content and Capabilities

Rules can contain various types of guidance:

- **Coding Style Guides:** Naming conventions, formatting rules, API usage guidelines
- **Architecture and Design Decisions:** Project structure, design patterns, technology choices
- **Boilerplate Templates:** Templates for common code structures, component patterns
- **Workflow Instructions:** Step-by-step procedures for common tasks
- **Testing and QA Checklists:** Quality criteria, security practices, review procedures
- **Project Knowledge Base:** Domain concepts, framework explanations, module structure

### File Referencing

Use `@filename` syntax to include external file content:

```markdown
# React Component Guidelines

@templates/component-template.tsx

# Additional Guidelines
- Always include PropTypes
- Add JSDoc comments for all props
```

## Loading Process

When working with files in Cursor, the rules are processed as follows:

1. Load global user preferences (from Cursor settings)
2. Load all "Always Apply" rules from the root `.cursor/rules/` directory
3. Check file paths against glob patterns for "Auto-Attached" rules
4. If working in a subdirectory with a `.cursor/rules/` folder, load applicable rules
5. Add any manually selected rules
6. Merge all applicable rules into the context (with precedence for more specific rules)

```mermaid
flowchart TD
    subgraph Stage 1: Injection
        A[Rule file present] --> B{alwaysApply = true?}
        B -- Yes --> I[Inject rule content into prompt]
        B -- No --> C{Matches globs pattern?}
        C -- Yes --> I[Inject rule content into prompt]
        C -- No --> J[Don't inject content yet]
    end
    subgraph Stage 2: Activation
        D[List rule name & description to AI] ---> E{Relevant to query?}
        E -- Yes --> F[AI fetches rule content]
        E -- No --> G[AI ignores the rule]
        I--> H[Injected rules are already active]
    end
```

## Managing Rules

- **Creating Rules:** Use Command Palette (Cmd + Shift + P) > "New Cursor Rule"
- **Viewing/Editing:** Access in Cursor Settings > Project Rules, or edit `.mdc` files directly
- **Version Control:** Commit rule files to your repository for team sharing
- **Updates:** Changes to rules apply to new conversations (not retroactively to ongoing chats)
- **Generating Rules:** Ask the AI to "/Generate Cursor Rules" from a conversation

## Best Practices for Cursor Rules

- **One concern per file**: Keep rules small and focused
- **Use proper description and globs in front-matter**: Help both users and the AI understand when rules apply
- **Keep critical always-apply rules at the root level**: Put common patterns in the main rules directory
- **Limit nesting to 2-3 levels for maintainability**: Too deep of a structure becomes hard to manage
- **Use for domain-specific guidance in monorepos**: Particularly effective for projects with multiple technologies
- **Be specific and actionable**: Provide concrete examples rather than vague advice
- **Keep rules updated**: Review and revise rules as your project evolves
- **Avoid redundancy and contradictions**: Ensure rules don't duplicate or conflict with each other
- **Test your rules incrementally**: Verify the AI follows your guidance after adding or changing rules

## Best Practices for Nested Rules

- **Follow component architecture**: Align rule structure with your codebase organization
- **Create technology-specific rules**: e.g., React conventions in frontend directory, Python conventions in API directory
- **Document rule locations**: Include a rules index in your project README or developer documentation
- **Regularly audit and update**: Remove outdated rules and ensure content stays relevant
- **Prefer globs over always-apply for subdirectories**: More precise control over when rules are loaded

## Limitations and Considerations

- **No Native Templating Language:** The `.mdc` format doesn't support dynamic placeholders
- **Glob Pattern Limitations:** Brace expansion (e.g., `{ts,tsx}`) is not supported
- **Dynamic Updates:** Rule changes only apply to new conversations, not ongoing ones
- **No Cross-Project Rules Linking:** Each project's rules are isolated to that project
- **Rules Only Guide, Not Dictate:** The AI might still occasionally produce output that doesn't follow a rule

## Mixdown Integration

> [!NOTE]
> 🚧 Pending Mixdown integration