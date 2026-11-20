# Working in this repository

- Work directly on `main` with small, self-contained commits. Push to `main` to run CI and release.
- Use Prettier for formatting and ESLint for linting. Run `pnpm format` to apply formatting and `pnpm format:check` to verify it. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing.
- Follow the existing ESM TypeScript style. Use explicit type-only imports and keep Node-specific storage code behind the `/file` entry point.

## Commit messages and versions

Use Conventional Commits in the form `type(scope): short imperative summary`. Scope is optional.

| Commit example                          | Release |
| --------------------------------------- | ------- |
| `fix(file): handle an empty clock file` | Patch   |
| `feat: add a clock implementation`      | Minor   |
| `feat!: change the clock interface`     | Major   |
| `docs: clarify installation`            | None    |

A `BREAKING CHANGE:` footer in a commit body also triggers a major release. Separate it from the subject or body with a blank line. Use `docs`, `test`, `ci`, `chore`, or `refactor` for changes that need no release. The highest bump across all commits since the deployed version wins.

CI computes the next version from npm's `latest` version and the published commit. Leave version bumps and `v<version>` tags to CI. If npm accepted a release and Git tagging failed, rerun CI from `main` to restore the tag using the published commit.

## Initial npm setup

1. After CI checks pass, use a clean checkout of the verified `main` commit and install dependencies with `pnpm install --frozen-lockfile`.
2. An npm maintainer with publish access to `@bloom-group` runs `node scripts/release.mjs bootstrap`, then publishes the printed tarball with `npm publish <tarball> --access public`. This establishes the initial `1.0.0` baseline and records its commit.
3. In the package's npm settings, add a GitHub Actions trusted publisher with owner `BloomTechNL`, repository `clock`, workflow `release.yml`, and permission to publish. Complete the first automated publish within two days of adding the configuration. [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
