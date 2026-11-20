# Working in this repository

- Work directly on `main` with small, self-contained commits. Push to `main` to run CI and release.
- Use Prettier for formatting and ESLint for linting. Run `pnpm format` to apply formatting and `pnpm format:check` to verify it. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing.
- Follow the existing ESM TypeScript style. Use explicit type-only imports and keep Node-specific storage code behind the `/file` entry point.

## Commit messages and releases

Use Conventional Commits in the form `type(scope): short imperative summary`. Scope is optional. Commit types do not decide the version.

## Releasing

The version in `package.json` is the release. Pushing to `main` runs CI. When `version` is not yet on npm, the `publish` job publishes it with `--provenance` and pushes the `v<version>` tag. When the version is already published, nothing is released.

To release, bump `version` in `package.json` (semver: patch for fixes, minor for features, major for breaking changes) and push to `main`. Never bump the version in a commit that should not be released. If npm accepted a release and tagging failed, create and push the `v<version>` tag for the published commit by hand.

## Initial npm setup

1. An npm maintainer with publish access to `@bloom-group` publishes `1.0.0` from a clean checkout of the verified `main` commit: `pnpm install --frozen-lockfile`, then `npm publish --access public`.
2. In the package's npm settings, add a GitHub Actions trusted publisher with owner `BloomTechNL`, repository `clock`, workflow `release.yml`, and **Allow `npm publish`** enabled. [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
