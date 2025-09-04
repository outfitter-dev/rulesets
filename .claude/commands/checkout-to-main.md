# Checkout to Main

## Instructions

When the user invokes this command, follow these steps in sequence:

1. Check for uncommitted changes on the current branch
2. Handle uncommitted changes appropriately
3. Switch to the main branch safely
4. Update with the latest remote changes

## Important Considerations

1. ✴️ Never lose uncommitted work - always provide options to preserve changes
2. ✴️ Alert the user about important changes that need attention
3. ✴️ Ensure a clean state on the main branch after switching

## Steps

### 1. Check Current Status

- Identify the current branch
- Check if there are any uncommitted changes using `git status`
- If already on main branch, simply pull latest changes and inform the user

### 2. Handle Uncommitted Changes

If uncommitted changes exist:
- Categorize the changes (staged, unstaged, untracked)
- Present options to the user:
  - Stash changes for later retrieval (recommended for work in progress)
  - Commit changes to the current branch
  - Abort the operation to handle changes manually

### 3. Switch to Main Branch

- After handling any uncommitted changes (or if there were none):
  - Check out the main branch
  - Verify the checkout was successful

### 4. Update Main Branch

- Fetch the latest changes from the remote
- Pull updates from the remote main branch
- Verify the branch is up to date

### 5. Confirm Success

- Display the current branch status
- Show any relevant information about the main branch (e.g., recent commits)
- Provide information about any stashed changes if applicable

## Command Examples

```bash
# Check current branch and status
git branch --show-current
git status

# Stash changes if needed
git stash push -m "Auto-stashed before switching to main"

# Switch to main branch
git checkout main

# Update with latest changes
git fetch --all
git pull origin main

# Show recent commits
git log --oneline -n 5

# Show stashed changes (if any were stashed)
git stash list
```

## Stash Retrieval Instructions

If changes were stashed during this operation, inform the user how to retrieve them:

```bash
# To view stashed changes
git stash list

# To apply the most recent stash (keeping it in the stash list)
git stash apply

# To apply and remove the most recent stash
git stash pop

# To apply a specific stash
git stash apply stash@{n}  # where n is the stash number
```