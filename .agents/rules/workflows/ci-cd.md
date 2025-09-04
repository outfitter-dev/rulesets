# CI/CD Workflow

## Local CI Validation

### Run Full CI Check

```bash
bun run ci:local
```

### Run CI Tests

```bash
bun run ci:test
```

### Run CI Build

```bash
bun run ci:build
```

### Run CI Lint

```bash
bun run ci:lint
```

## GitHub Actions

### Run Workflow Locally

```bash
act -j test
act -j build
act -j lint
```

### Trigger Workflow Manually

```bash
gh workflow run ci.yml
```

### View Workflow Runs

```bash
gh run list
```

### View Workflow Logs

```bash
gh run view [run-id] --log
```

### Cancel Workflow Run

```bash
gh run cancel [run-id]
```

### Re-run Failed Jobs

```bash
gh run rerun [run-id] --failed
```

## Deployment

### Deploy to NPM

```bash
bun changeset publish
```

### Deploy Documentation

```bash
bun run docs:deploy
```

### Deploy to Staging

```bash
bun run deploy:staging
```

### Deploy to Production

```bash
bun run deploy:production
```

## Monitoring

### Check Deployment Status

```bash
gh deployment list
```

### View Deployment Logs

```bash
gh deployment view [deployment-id]
```

### Check Package Version

```bash
npm view @outfitter/rulesets version
```

### Monitor Build Times

```bash
gh run list --workflow=ci.yml --json conclusion,createdAt,updatedAt | jq
```
