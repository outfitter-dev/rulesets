# Bun Version Strategy for CI/CD

## Current Issue

We're experiencing a Bun registry error that affects v1.2.19 and v1.2.20:

```text
error: Failed to join registry "https://registry.npmjs.org" and package "@types/js-yaml" URLs
error: An internal error occurred (InvalidURL)
```

## Version Pinning Strategy

### Current Approach (Recommended)

**Pin to v1.1.38** - Last known stable version before registry URL parsing issues

```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: 1.1.38 # Pinned to stable version
```

### Why Not Use `latest`?

Using `latest` in CI/CD is **strongly discouraged** for production workflows:

1. **Non-deterministic builds**: Different runs get different versions
2. **Breaking changes**: New releases may introduce incompatibilities
3. **Debug difficulty**: Hard to reproduce issues across time
4. **Security**: No control over when security updates are applied
5. **Performance**: No predictability in build times or behavior

### Version Management Best Practices

#### 1. Always Pin Versions in Production

```yaml
# ✅ GOOD - Deterministic
bun-version: 1.1.38

# ❌ BAD - Non-deterministic
bun-version: latest

# ⚠️ OKAY for testing only
bun-version: ${{ matrix.bun-version }}  # In test matrix
```

#### 2. Use Repository Variables for Centralized Management

```yaml
# In your workflow
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: ${{ vars.BUN_VERSION || '1.1.38' }}
```

Set via GitHub UI: Settings → Secrets and variables → Actions → Variables

- `BUN_VERSION`: `1.1.38`

#### 3. Implement Progressive Rollout

```yaml
# Main branch - stable
if: github.ref == 'refs/heads/main'
with:
  bun-version: 1.1.38

# Development - test newer versions
if: github.ref == 'refs/heads/develop'
with:
  bun-version: 1.2.20
```

#### 4. Monitor and Test New Versions

Use the `test-bun-versions.yml` workflow to validate new releases:

```bash
# Test specific versions manually
gh workflow run test-bun-versions.yml -f versions="1.1.38,1.2.20,1.2.21"

# View results
gh run list --workflow=test-bun-versions.yml
```

## Migration Path

### Short Term (Immediate)

1. ✅ Pin to v1.1.38 in all workflows
2. ✅ Clear Bun cache on workflow_dispatch events
3. ✅ Add error handling for install failures

### Medium Term (1-2 weeks)

1. Set up weekly automated version testing
2. Create version compatibility matrix
3. Document known working versions
4. Report issue to Bun maintainers with reproduction

### Long Term (1+ month)

1. Migrate to fixed version when available
2. Implement canary deployments for version updates
3. Consider fallback strategies (npm/yarn as backup)
4. Evaluate self-hosted runners with cached dependencies

## Troubleshooting

### If Registry Errors Persist

1. **Clear Cache**

   ```yaml
   - run: bun pm cache rm
   ```

2. **Check Registry Configuration**

   ```yaml
   - run: |
       # Ensure no conflicting .npmrc settings
       cat .npmrc || echo "No .npmrc found"
       cat ~/.npmrc || echo "No user .npmrc found"
   ```

3. **Use Verbose Logging**

   ```yaml
   - run: bun install --verbose
   ```

4. **Try Alternative Install Methods**

   ```yaml
   # Use yarn lockfile (if available)
   - run: bun install --yarn

   # Force fresh install
   - run: bun install --force
   ```

### Known Working Configurations

| Bun Version | Status               | Notes                      |
| ----------- | -------------------- | -------------------------- |
| 1.1.38      | ✅ Stable            | Recommended for production |
| 1.1.34      | ⚠️ Issues on Windows | InvalidURL on Windows      |
| 1.2.19      | ❌ Registry Error    | @types/js-yaml issue       |
| 1.2.20      | ❌ Registry Error    | Issue persists             |
| latest      | ❌ Not Recommended   | Non-deterministic          |

## Alternative Solutions

### 1. Temporary NPM Fallback

```yaml
- name: Install Dependencies
  run: |
    if ! bun install --frozen-lockfile; then
      echo "Bun install failed, falling back to npm"
      npm ci
    fi
```

### 2. Docker Container with Pre-installed Dependencies

```yaml
- name: Use Pre-built Container
  uses: docker://myorg/bun-deps:1.1.38
```

### 3. Cache Dependencies Aggressively

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.bun/install/cache
      node_modules
      .turbo
    key: deps-${{ runner.os }}-${{ hashFiles('**/bun.lockb') }}
    restore-keys: |
      deps-${{ runner.os }}-
```

## Monitoring

### Set Up Alerts

1. Create GitHub Action workflow status badge
2. Set up Slack/Discord notifications for failures
3. Monitor Bun GitHub issues for fixes
4. Track performance metrics across versions

### Key Metrics to Track

- Install time
- Build time
- Test execution time
- Cache hit rate
- Failure rate by version

## References

- [Bun InvalidURL Issue #12342](https://github.com/oven-sh/bun/issues/12342)
- [Bun Registry Configuration](https://bun.sh/docs/install/registries)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/guides)
- [Semantic Versioning](https://semver.org/)

## Next Steps

1. **Immediate**: Commit and push the pinned version changes
2. **Today**: Test the workflows with v1.1.38
3. **This Week**: Set up version monitoring
4. **Ongoing**: Track Bun releases for registry fix

---

Last Updated: 2025-08-18
Issue Status: Active - Awaiting fix in Bun
Tracking Issue: Create at <https://github.com/oven-sh/bun/issues>
