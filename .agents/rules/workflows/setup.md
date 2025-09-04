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

On Windows, use the official installer from <https://bun.sh/> or `powershell -c "irm bun.sh/install.ps1 | iex"`.

### Install Required Tools

```bash
# Install GitHub CLI
brew install gh

# Add Turbo (pinned) to the repo
bun add -D turbo
```

### Configure Git

```bash
git config --local user.name "[Your Name]"
git config --local user.email "[your.email@example.com]"
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
bunx turbo build && bunx turbo test
```

### Check Environment

```bash
bun run env:check
```
