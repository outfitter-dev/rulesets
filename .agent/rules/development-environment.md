# Repository Development Environment Rules

## Package Manager: Bun-only

- Use Bun for all installs and scripts.
- Do not use npm, Yarn, or pnpm in this repository.
- Common commands:
  - Install: `bun install` (use `--frozen-lockfile` in CI)
  - Run scripts: `bun run <script>`

## Bun Version Strategy

- Default to latest: `.bun-version` is set to `latest`.
- If a release causes issues, temporarily pin `.bun-version` to a known-good version; revert to `latest` once resolved.
- CI setup:
  - Setup: `oven-sh/setup-bun@v2` with `bun-version-file: .bun-version`.
  - Cache: hash `**/bun.lock*` and `**/package.json`.
  - Install: `bun install --frozen-lockfile`.

## Version Testing

- Use `.github/workflows/test-bun-versions.yml` to verify new releases (includes `latest`).

## Troubleshooting

- Clear cache: `bun pm cache rm`
- Verbose install: `bun install --verbose`
- Force reinstall: `bun install --force`
