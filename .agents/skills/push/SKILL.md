---
name: push
description: Safely prepare, commit and push the current project to GitHub. Use this skill whenever the user says "push", asks to push the project, commit and push changes, publish current changes to GitHub, or explicitly invokes $push.
---

# Git Push Workflow

Execute a safe Git commit and push workflow for the current project.

The workflow must adapt to the current state of the repository.

Do not blindly execute commands.

Inspect the repository first and only perform the steps that are necessary.

---

## Step 1 — Detect the repository

Determine whether the current directory belongs to a Git repository.

Run:

`git rev-parse --is-inside-work-tree`

If the command succeeds and returns `true`:

- Git is already initialized.
- DO NOT run `git init`.
- Continue to the next step.

If the command fails because this is not a Git repository:

Initialize Git using:

`git init -b main`

Then continue.

Do not reinitialize an existing Git repository.

---

## Step 2 — Determine the repository root

Determine the Git root with:

`git rev-parse --show-toplevel`

Perform the remaining Git operations from the repository root.

---

## Step 3 — Inspect repository state

Run:

`git status --short`

Then:

`git status`

Understand:

- modified files
- deleted files
- new files
- staged files
- untracked files
- current branch

Do not commit immediately.

Inspect what is about to be committed first.

---

## Step 4 — Security inspection

Before staging files, check for sensitive files.

Pay special attention to:

- `.env`
- `.env.*`
- private keys
- `.pem`
- `.key`
- API credentials
- access tokens
- database passwords
- service account credentials
- secret configuration files

Never intentionally commit credentials.

If an untracked sensitive file exists and is not ignored:

- add the appropriate entry to `.gitignore`
- preserve all existing `.gitignore` content
- never overwrite the entire `.gitignore`

If `.gitignore` does not exist, create it only when necessary.

Typical rules may include:

`.env`
`.env.*`
`!.env.example`
`node_modules/`

Only add rules that make sense for the current project.

If a sensitive file is already tracked by Git:

STOP before pushing.

Explain to the user that the sensitive file is already tracked and must be handled safely.

Do not push potential secrets to GitHub.

---

## Step 5 — Check the remote

Check existing remotes:

`git remote -v`

Then specifically check:

`git remote get-url origin`

### If origin exists

Use the existing origin.

Do not ask the user for the remote URL.

Continue automatically.

### If origin does not exist

Do not invent a repository URL.

Ask the user:

"Ce projet n'a pas encore de remote GitHub `origin`. Envoie-moi le lien du dépôt GitHub, par exemple `https://github.com/username/repository.git`, et je continue le push."

STOP the current workflow at this point.

Do not cancel the overall task.

When the user provides the URL in the next message, continue the same workflow.

Validate that the provided URL looks like a GitHub repository URL.

Examples:

`https://github.com/username/repository.git`

`https://github.com/username/repository`

`git@github.com:username/repository.git`

Then add it:

`git remote add origin <REMOTE_URL>`

Verify it:

`git remote -v`

Then continue automatically with the following steps.

Do not ask the user to type the Git command themselves.

---

## Step 6 — Detect current branch

Determine the branch:

`git branch --show-current`

If this is a newly initialized repository and the branch does not yet exist because there is no commit, use `main`.

Do not unnecessarily rename branches in existing repositories.

Remember the branch name for the push operation.

---

## Step 7 — Inspect changes

Inspect unstaged changes when appropriate:

`git diff`

Inspect staged changes when appropriate:

`git diff --cached`

Understand what changed before generating the commit message.

Do not generate a random or generic commit message if the changes can be understood.

---

## Step 8 — Stage safe changes

After verifying that sensitive files will not be committed, stage the project changes.

Use:

`git add -A`

Then verify:

`git status --short`

Inspect the staged changes if necessary:

`git diff --cached --stat`

and:

`git diff --cached`

Do not continue if a sensitive file was accidentally staged.

Unstage unsafe files before continuing.

---

## Step 9 — Determine whether a commit is necessary

Check whether staged changes exist.

If staged changes exist:

Generate an appropriate commit message based on the actual modifications.

Prefer Conventional Commit style.

Examples:

`feat: add company authentication`

`fix: resolve locations section export`

`style: improve responsive navigation`

`refactor: simplify notification controller`

`docs: update project documentation`

`chore: update project configuration`

The message must describe the real changes.

Then run:

`git commit -m "<generated-message>"`

If there are no changes to commit:

Do not create an empty commit.

Continue to the push step because existing local commits may still need to be pushed.

---

## Step 10 — Verify the commit

When a commit was created, retrieve its information.

Use:

`git log -1 --oneline`

Optionally retrieve the full hash:

`git rev-parse HEAD`

Keep the commit hash and commit message for the final report.

---

## Step 11 — Determine upstream status

Determine whether the current branch already has an upstream branch.

Use Git to inspect the current branch tracking configuration.

If an upstream exists:

push normally:

`git push`

If there is no upstream:

push and configure it:

`git push -u origin <CURRENT_BRANCH>`

Replace `<CURRENT_BRANCH>` with the actual current branch.

Example:

`git push -u origin main`

Do not hardcode `main` when the current repository uses another branch such as:

- master
- develop
- dev
- staging
- feature/*
- fix/*

Always preserve the existing current branch.

---

## Step 12 — Handle push failures safely

If authentication is required:

Allow Git/GitHub authentication to proceed normally.

Do not ask the user for their GitHub password.

If the remote repository contains commits that conflict with the local repository:

Do not force push.

Do not run:

`git push --force`

Do not run:

`git push -f`

Do not automatically destroy or overwrite remote history.

Explain the situation to the user.

If another recoverable Git error occurs:

analyze the error and attempt a safe solution.

Never use destructive Git operations without explicit authorization.

---

## Step 13 — Final verification

After pushing, run:

`git status`

Verify that the current branch is synchronized when possible.

Retrieve:

`git log -1 --oneline`

Check the remote:

`git remote get-url origin`

---

## Step 14 — Final response

After a successful push, give the user a concise report.

Example:

Push terminé avec succès.

Branch: main
Commit: a38d1f7
Message: feat: add company job application filters
Remote: origin
Repository: https://github.com/user/project.git

If no new commit was necessary, say so.

Example:

Push terminé avec succès.

Aucune nouvelle modification à commit.
Les commits locaux existants ont été poussés vers GitHub.

Do not give unnecessary Git explanations after a successful workflow.