# Pull Request Workflow

## Create Pull Request

### Push Branch and Create PR

```bash
git push -u origin HEAD
gh pr create --base main --head "$(git branch --show-current)" --title "[type]: [description]" --body "[detailed description]"
```

### Create Draft PR

```bash
gh pr create --draft --title "WIP: [description]"
```

### Create PR with Template

```bash
gh pr create --template .github/pull_request_template.md
```

### Create PR with Reviewers

```bash
gh pr create --reviewer [username1] --reviewer [username2]
```

### Create PR with Labels

```bash
gh pr create --label enhancement --label documentation
```

## Manage Pull Requests

### List Open PRs

```bash
gh pr list
```

### View PR Details

```bash
gh pr view [pr-number]
```

### Check PR Status

```bash
gh pr status
```

### Checkout PR Locally

```bash
gh pr checkout [pr-number]
```

### Review PR

```bash
gh pr review [pr-number]
```

### Approve PR

```bash
gh pr review [pr-number] --approve
```

### Request Changes

```bash
gh pr review [pr-number] --request-changes --body "Please address these issues..."
```

### Comment on PR

```bash
gh pr comment [pr-number] --body "Great work! Just one suggestion..."
```

## Update Pull Request

### Push Additional Commits

```bash
git add -A && git commit -m "fix: address review feedback"
git push
```

### Update PR Title/Description

```bash
gh pr edit [pr-number] --title "New Title" --body "New Description"
```

### Add Labels

```bash
gh pr edit [pr-number] --add-label "ready-for-review"
```

### Mark Ready for Review

```bash
gh pr ready [pr-number]
```

## Merge Pull Request

### Merge PR

```bash
gh pr merge [pr-number] --merge
```

### Squash and Merge

```bash
gh pr merge [pr-number] --squash
```

### Rebase and Merge

```bash
gh pr merge [pr-number] --rebase
```

### Auto-merge

```bash
gh pr merge [pr-number] --auto
```
