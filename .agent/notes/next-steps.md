# Next Steps towards v0.1

## TODO

- [ ] Update all versions to `0.1.0-beta.0`
  - [ ] Create `release/v0.1-beta` branch from current work
    - [ ] Keep `main` as the primary stable branch
    - [ ] Use `release/v0.1-beta` for beta development and testing
    - [ ] Merge beta changes back to `main` for stable v0.1.0 release
  - [ ] `changeset pre enter beta`
  - [ ] `@rulesets/core@beta`
  - [ ] We need to write up documentation for how we're going to handle `beta` to simply `x.y.z` transitions
- [ ] Deprecate the "legacy compatibility" code
  - This repo isn't in use yet, so **backwards compatibility isn't needed**
- [ ] Abstract providers into their own packages (e.g. `@rulesets/claude-code-provider`)
- [ ] Move types to `@rulesets/types`
- [ ] Move schemas to `@rulesets/schemas`
- [ ] Move utils to `@rulesets/utils`
- [ ] Move configs to `@rulesets/config`
- [ ] Add `apps/cli` to build the `ruleset` binary
- [ ] Add branded type updates to test files
- [ ] Rename `ruleset.config.jsonc` to simply `ruleset.jsonc`
- [ ] Remove the `outputPath` from the `ruleset.jsonc` as this should be handled by the provider by default
  - [ ] Ensure that `outputPath` is still supported for alternative output paths
- [ ] For source rules files, remove `destinations` and use `providers` instead
- [ ] Ensure that `@path/to/file.md` syntax is properly documented for provider tools to handle
  - [ ] Note: File embedding is handled by downstream provider tools, not by Rulesets itself
  - [ ] Document the expected path rewriting behavior (relative to project root, determined by `ruleset.jsonc`)
- [ ] Standard bare Markdown links (`[path/to/file.md]`) and aliased links should be supported, and should be rewritten based on the `provider` configuration
  - Pay particular attention to `cursor` with this and rewrite bare links to `[path/to/file](path/to/file.mdc)` and ensure the path is relative to the output path.

## Additional Notes

- `providers` should use provider IDs and provider versions (e.g. `"providers": {"claude-code": "^1.0.0"}`)
- `providers` should only be necessary to include in source rules files if the user wants to _override_ the default options
- We should consider using bun's runtime run the `ruleset` binary, for its concurrency and performance benefits
- The `version` key in source rules files should be changed to `schema` which would match to versioned schemas provided by `@rulesets/schemas`
  - This would allow us to version the ruleset schema and provide a way to migrate rulesets to new versions
  - If no `schema` is provided, we should default to the latest version, or have a method where we can determine outdated schemas and provide a way to migrate them, or compile gracefully
- We should add `version` under `ruleset` to allow for versioning of the source rules files

## Fast-follow Features

- Add MCP support for `cursor` and `windsurf`
  - Use `.ruleset/src/mcp.json` to define MCP server configuration
    - Add support for `providers` per-server configuration as an array of provider IDs to override inclusion of all providers for all servers
