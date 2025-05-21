# Clean Branches

## Instructions

When the user invokes this command, follow these steps in sequence:

1. Check if there are any uncommitted changes in the current branch and if so, alert the user and provide options to move forward
2. Switch to the main branch
3. Update the local repository with remote changes
4. Identify and delete local branches that have been merged or deleted from the remote

## Important Considerations

1. ✴️ If the user has important work on a branch that has not been committed, and isn't at remote, alert them and provide options to move forward
2. ❌ Never force delete branches without explicit user confirmation
3. ❌ Never delete protected branches (main, master, develop, dev)

## Steps

### 1. Check for Uncommitted Changes

- Check the current git status
- If there are uncommitted changes:
  - Ask the user if they want to stash, commit, or abort the operation
  - Handle the changes according to the user's choice

### 2. Switch to Main Branch

- Determine the current branch
- If not already on the main branch:
  - Checkout the main branch
  - Pull the latest changes

### 3. Sync with Remote

- Fetch all remote branches and prune references to deleted remote branches
- Pull the latest changes for the main branch

### 4. Identify and Clean Branches

- List all local branches
- Identify branches that:
  - Have been merged into main
  - Have been deleted from the remote
  - Are stale (not updated in a long time)
- Present these branches to the user with their status
- Ask for confirmation before deletion
- Delete the confirmed branches

#### Identifying Stale Branches

- To help identify branches that have not been updated in a long time, you can sort branches by last commit date:

  ```bash
  git branch --sort=-committerdate
  ```

- Review branches near the bottom of the list for staleness.

### 5. Confirm Cleanup

- Display a summary of the cleaned branches
- Show the current status of the repository

## Command Example

```bash
# Fetch from remote and prune references
git fetch --all --prune

# Switch to main branch and update it
git checkout main
git pull

# Show merged branches 
git branch --merged main | grep -v "^\*\|main\|master\|dev\|develop"

# List branches whose remote tracking branches no longer exist
git branch -vv | grep ': gone]' | awk '{print $1}'

# List all branches sorted by last commit date (stale branches are near the bottom)
git branch --sort=-committerdate

# Delete branches after confirmation
git branch -d <branch-name>  # For merged branches
git branch -D <branch-name>  # For force deletion if needed
```
