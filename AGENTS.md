# Working in this repository

- Work directly on `main` with small, self-contained commits. Push to `main` to run CI. Releases are dispatched separately.
- Use Prettier for formatting and ESLint for linting. Run `pnpm format` to apply formatting and `pnpm format:check` to verify it. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing.
- Follow the existing ESM TypeScript style. Use explicit type-only imports and keep Node-specific storage code behind the `/file` entry point.

## Commit messages and releases

Use Conventional Commits in the form `type(scope): short imperative summary`. Scope is optional. Commit types do not decide the version.

## Installing and changing dependencies

- Run `npm run deps:install` to validate and audit the frozen lockfile before installing. This runs Husky setup explicitly after installing with lifecycle scripts disabled.
- For dependency changes, resolve with `pnpm add --lockfile-only --ignore-scripts <package>` or `pnpm update --lockfile-only --ignore-scripts <package>`, then run `npm run deps:install`. Use npm only to invoke repository scripts. Avoid plain install or add commands, which can install packages before the advisory check.

## Releasing

Bump `package.json` using semver and push to `main`. Once CI passes, a maintainer dispatches **CI and npm release** on `main` with the exact version. After GitHub environment approval, the workflow publishes the checked tarball with provenance and pushes `v<version>`. If npm accepted the release and tagging failed, rerun the failed tag job or push the tag for the published commit by hand.

## npm and GitHub setup

`@bloom-group/clock@1.0.0` is already published, so no manual publish is needed. Keep these settings in place:

1. In GitHub, configure the `npm-release` environment for deployments from the `main` branch only. Require maintainer reviewers and disable self-review and administrator bypass.
2. In npm, the trusted publisher uses owner `BloomTechNL`, repository `clock`, workflow `release.yml`, environment `npm-release`, and **Allow `npm publish`** enabled. The environment binding is required so a workflow change cannot obtain npm publishing access by omitting the environment. [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
3. In GitHub repository settings, require actions to be pinned to a full-length commit SHA, and add a ruleset that blocks force-pushes and deletion on `main` and protects `v*` tags. Pin new or updated actions as `owner/repo@<sha> # <tag>`.
