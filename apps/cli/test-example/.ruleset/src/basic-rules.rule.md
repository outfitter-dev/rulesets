---
ruleset:
  version: 0.1.0

title: 'Basic Development Rules'
description: 'Simple example showing Rulesets basics'

providers:
  cursor:
    enabled: true
  claude-code:
    enabled: true

author: 'Test Author'
---

# Basic Development Rules

This is a test rule file for auto-discovery.

## Instructions

{{instructions}}
- Follow TypeScript best practices
- Use descriptive variable names
- Write unit tests for all functions
{{/instructions}}

## Code Style

{{code-style}}
- Use 2 spaces for indentation
- Prefer const over let
- Use arrow functions where appropriate
{{/code-style}}