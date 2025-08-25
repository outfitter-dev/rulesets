# Release Workflow

## Changeset Management

### Create Changeset

```bash
bun changeset
```

### Add Changeset with Type

```bash
bun changeset add --type patch
bun changeset add --type minor
bun changeset add --type major
```

### View Pending Changesets

```bash
bun changeset status
```

### Version Packages

```bash
bun changeset version
```

## Publishing

### Publish to NPM

```bash
bun changeset publish
```

### Publish with Tag

```bash
bun changeset publish --tag beta
bun changeset publish --tag next
```

### Dry Run Publish

```bash
bun changeset publish --dry-run
```

## Version Management

### Check Current Version

```bash
jq -r '.version' package.json
# Fallback (if jq unavailable):
# grep -oP '(?<=^  "version": ")[^"]+' package.json
```

### Tag Release

```bash
git tag -a v[version] -m "Release v[version]"
git push origin v[version]
```

### Create GitHub Release

```bash
gh release create v[version] --title "Release v[version]" --notes "[release notes]"
```

### Create Pre-release

```bash
gh release create v[version] --prerelease --title "Pre-release v[version]"
```

## Release Preparation

### Update Changelog

```bash
bun run changelog
```

### Build for Production

```bash
NODE_ENV=production turbo run build
```

### Run Release Tests

```bash
bun run test:release
```

### Verify Package Contents

```bash
npm pack --dry-run
```

## Post-Release

### Announce Release

```bash
gh release view v[version] --web
```

### Update Documentation

```bash
bun run docs:update-version
```

### Sync Main Branch

```bash
git checkout main && git pull origin main
```
