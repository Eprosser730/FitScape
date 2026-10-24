# Contributing to FitScape

Every change is traceable: **issue → branch → small commits → pull request → review → squash merge.**
`main` is protected: direct pushes are rejected, and everything lands through a PR.

## 1. Start from an issue

Every PR closes an issue. If there isn't one, open it first using a template (Feature or Bug).
Give it a type label (`feat`, `fix`, `docs`, …), an area label if relevant (`area:backend`, …), and a milestone.

## 2. Branch

```
<type>/<issue-number>-<short-name>
```

Examples: `feat/12-signin-page`, `fix/31-lockout-timer`, `docs/1-conventions`

Always branch from an up-to-date `main`:

```bash
git switch main && git pull
git switch -c feat/12-signin-page
```

## 3. Commit

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short summary in present tense>

<optional body: what and why, not how>
```

| Type | Use for |
|------|---------|
| `feat` | New user-facing capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `refactor` | Code change with no behavior change |
| `chore` | Tooling, config, dependencies |
| `ci` | CI/CD workflows |

Keep commits small and focused. They are squashed on merge, so the PR title is what lands on `main`.

## 4. Open a pull request

- **Title**: a Conventional Commit line, e.g. `feat: sign-in page with inline sign-up`. It becomes the commit on `main`.
- **Body**: fill in every section of the template, including `Closes #<issue>`.
- One concern per PR. If you find something unrelated, open a new issue instead of fixing it here.

## 5. Review ritual (required for every code change)

Before merging, the author:

1. **Tests:** writes tests with the change and runs them locally and in CI.
2. **Critiques the change** in the PR's *Review* section:
   - ✅ What's right
   - ⚠️ What's wrong or risky
   - 💡 What could be better
   - 🧭 Decision on each item: *fixed in this PR* or *deferred → #issue*
3. Runs the relevant automated reviewers (code, security for auth or input handling).

Nothing deferred is lost: it becomes its own issue.

## 6. Merge

Squash merge only. The branch is deleted automatically. The linked issue closes itself.

## Architecture decisions

Significant choices (frameworks, data model, security trade-offs) are recorded as ADRs in [`docs/adr/`](docs/adr/).
If a PR changes one of those decisions, add a new ADR that supersedes the old one. Don't rewrite history.

## Secrets

Never commit secrets. Real values live in `.env` files (gitignored). Commit a `.env.example` with placeholder values instead.
GitHub secret scanning and push protection are enabled as a backstop, not a substitute.
