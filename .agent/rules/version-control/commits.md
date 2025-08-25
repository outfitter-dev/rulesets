# Commit Rules

## Formatting

- Use Conventional Commits format
- Include `(scope)` in the commit message if the change is related to a specific part of the codebase
- Lowercase for commit messages
- Examples:

  ```text
  feat(scope): add new feature
  fix(api): resolve timeout issue
  docs: update readme
  ```

## Commands

- `bun run prepare` → install `lefthook`
- `bun run commit` → run `commit`
- `bun run commitlint` → run `commitlint`
- `bun run pre:commit` → run `lefthook run pre-commit`
- `bun run pre:push` → run `lefthook run pre-push`
