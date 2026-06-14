---
description: Release a new application version
---

Release a new version of the application by following the workflow below.

Requirements

* Perform all work on a temporary develop branch.
* Do not proceed if any test, lint, build, or static analysis step fails.
* Use squash merge when merging the release Pull Request.
* The GitHub Release tag and title must exactly match the application version.
* Do not skip any step.

Workflow

1. Create and switch to a new develop branch from the latest main.

git checkout main
git pull --ff-only
git checkout -b develop

2. Implement all requested features, fixes, and documentation updates.
3. Run all project validation steps and ensure they pass:
    * Tests
    * Lint checks
    * Type checks
    * Static analysis
    * Build verification
4. Determine the next application version and update all relevant version files.
5. Commit and push the release changes:

git add .
git commit -m "chore: release <version>"
git push -u origin develop

6. Create a Pull Request from develop to main using GitHub CLI.
7. Enable squash merge and merge the Pull Request:

gh pr merge --squash --delete-branch=false

8. Create a GitHub Release:
    * Tag name: <version>
    * Release title: <version>
    Example:

gh release create <version> --title "<version>"

9. Delete the remote develop branch:

git push origin --delete develop

10. Synchronize the local repository and remove the local branch:

git checkout main
git fetch origin --prune
git merge @{upstream} --ff-only
git branch -D develop

Success Criteria

A release is considered complete only when:

* All validation checks pass.
* The Pull Request has been merged into main.
* A GitHub Release has been published.
* The release tag matches the application version exactly.
* The remote develop branch has been deleted.
* The local repository is on an up-to-date main branch.