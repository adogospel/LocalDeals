---
name: push
description: Safely commit and push the current project to GitHub. Use when the user says "push", asks to commit/push changes, or invokes $push.
---

# Git Push

Safely commit and push the current repository.

## Workflow

1. Inspect the repository:
   - current branch
   - git status
   - remote origin
   - staged and unstaged changes

2. Check that no sensitive files or credentials are about to be committed.
   Never commit `.env`, private keys, API keys, tokens, passwords, or credentials.

3. If there is no Git repository, initialize one with `main`.

4. If `origin` is missing, ask the user for the GitHub repository URL and stop until it is provided.

5. Stage safe changes.

6. If there are changes to commit:
   - inspect them
   - generate a concise Conventional Commit message describing the actual changes
   - commit them

7. Push the current branch.
   - use the existing upstream when available
   - otherwise configure `origin/<current-branch>`

8. Never force-push or overwrite remote history without explicit user approval.

9. After the push, report only:
   - branch
   - commit hash
   - commit message
   - remote
   - whether the push succeeded