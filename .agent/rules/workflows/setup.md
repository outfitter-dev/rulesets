# Setup Workflow

## Initial Setup

### Clone Repository

```bash
git clone https://github.com/outfitter-dev/rulesets.git
cd rulesets
```

### Install Dependencies

```bash
bun install
```

### Setup Git Hooks

```bash
bun run prepare
```

### Configure Environment

```bash
cp .env.example .env.local
```

## Development Environment

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### Install Required Tools

```bash
# Install GitHub CLI
brew install gh

# Install Turbo
bun add -g turbo
```

### Configure Git

```bash
git config user.name "[Your Name]"
git config user.email "[your.email@example.com]"
```

## IDE Setup

### VS Code Extensions

```bash
code --install-extension biomejs.biome
code --install-extension ultracite.ultracite
```

### Configure TypeScript

```bash
# Generate tsconfig paths
bun run setup:tsconfig
```

## Project Configuration

### Initialize Ruleset Config

```bash
bun run init
```

### Create Source Rules Directory

```bash
mkdir -p .ruleset/src/_partials
```

### Setup Provider Configs

```bash
bun run setup:providers
```

## Verification

### Verify Installation

```bash
bun run doctor
```

### Run Test Build

```bash
turbo build && turbo test
```

### Check Environment

```bash
bun run env:check
```
