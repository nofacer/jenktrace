---
description: Release a new application version
---

Release a new version of the application by following the workflow below.

Input

The command input will be a GitHub issue. Treat that issue as the source of truth for the release scope:

* Read the issue title, description, and any relevant acceptance criteria.
* Implement every required change described in the issue before starting the release.
* If the issue is ambiguous, stop and resolve the ambiguity before proceeding.

Requirements

* Use the provided GitHub issue as the release task definition.
* Perform all work on a temporary develop branch.
* Do not proceed if any test, lint, build, or static analysis step fails.
* Use squash merge when merging the release Pull Request.
* The GitHub Release tag and title must exactly match the application version.
* Close the GitHub issue only after the release has been merged and published successfully.
* Do not skip any step.

Workflow

1. Create and switch to a new develop branch from the latest main.

git checkout main
git pull --ff-only
git checkout -b develop

2. Read the GitHub issue carefully and extract the full list of requested features, fixes, and documentation updates.
3. Implement all requested changes from the issue.
4. Run all project validation steps and ensure they pass:
    * Tests
    * Lint checks
    * Type checks
    * Static analysis
    * Build verification
5. Determine the next application version and update all relevant version files.
6. Commit and push the release changes:

git add .
git commit -m "chore: release <version>"
git push -u origin develop

7. Create a Pull Request from develop to main using GitHub CLI. Reference the GitHub issue in the Pull Request description when appropriate.
8. Enable squash merge and merge the Pull Request:

gh pr merge --squash --delete-branch=false

9. Create a GitHub Release:
    * Tag name: <version>
    * Release title: <version>
    Example:

gh release create <version> --title "<version>"

10. Close the GitHub issue after the Pull Request has been merged and the GitHub Release has been published.
    Example:

gh issue close <issue-number> --comment "Released in <version>."

11. Delete the remote develop branch:

git push origin --delete develop

12. Synchronize the local repository and remove the local branch:

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
* The GitHub issue has been closed after release publication.
* The remote develop branch has been deleted.
* The local repository is on an up-to-date main branch.
