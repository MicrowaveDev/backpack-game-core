# Tooling Routing

This document is the source of truth for deciding whether a script belongs in
Backpack Game Core or in a consuming game, and for invoking shared tooling
against Mushroom or Meat.

## Invocation Contract

Run supported commands from the consumer repository root through its npm alias:

```bash
npm run scripts:docs:check
```

The alias delegates to the core CLI and passes the consumer root explicitly:

```bash
backpack-game-core scripts:docs:check --repo-root .
```

For diagnostics, the equivalent package-bin form is:

```bash
npm exec -- backpack-game-core scripts:docs:check --repo-root .
```

`--repo-root` is required. A core command must never guess whether its current
checkout is Mushroom, Meat, a hub worktree, or the nested core submodule.
Optional path overrides are resolved relative to that root:

```bash
backpack-game-core scripts:docs:check \
  --repo-root . \
  --scripts-root app/scripts \
  --package-json package.json \
  --manifest app/scripts/command-manifest.json \
  --readme app/scripts/README.md
```

Agents should prefer the consumer npm alias. Use the expanded command only to
debug root/path routing or when adding the first wrapper in a new consumer.

## Ownership Test

| Script shape | Owner | Invocation |
| --- | --- | --- |
| Same operation and defaults for every consumer; only repository paths differ | Core CLI | Consumer npm alias passing `--repo-root .` |
| Shared algorithm, but product catalogs, thresholds, suites, outputs, or mutation policy differ | Core `tooling/*` library plus consumer wrapper | Consumer npm alias |
| Product database, provider, lore, art direction, queue semantics, deployment topology/policy, or credentials | Consumer only | Consumer npm alias or documented operator entry point |
| Docker Compose restart, cache cleanup, container diagnostics, and HTTP health waiting | Core shell runner plus consumer bootstrap/config wrapper | Consumer `bash/update-production-server.sh` |
| Reusable helper with no complete argument validation or process policy | Core library only | Import from a package subpath; never execute directly |

Moving a helper into core does not automatically make it a CLI command. Add a
core command only when its defaults and safety behavior are genuinely shared.

## Current Routes

| Concern | Core package route | Mode | Consumer owns |
| --- | --- | --- | --- |
| Script manifest and README validation | `backpack-game-core scripts:docs:check` and `tooling/commands` | CLI | Repository root and optional path overrides |
| PNG encode/decode, hashing, metadata bundles | `tooling/image` | Library | Input/output paths and product metadata |
| Indexed frame discovery and animation preparation | `tooling/frame-files` | Library | Naming convention, expected frame count, processing policy |
| Raster crop, resize, composition, diagnostics, fitting | `tooling/raster` | Library | Layout, dimensions, colors, and approval policy |
| Alpha, palette, component, frame, and matte analysis | `tooling/image-analysis` | Library | Thresholds and product verdicts |
| Dimension, alpha, margin, and freshness checks | `tooling/image-validation` | Library | Product image policy |
| HTML/raster review rendering | `tooling/image-review` | Library | Browser dependency, page layout, destinations |
| Atomic JSON and hash-bound evidence | `tooling/evidence` | Library | Evidence schema and product lifecycle |
| Image provenance bundles and checks | `tooling/provenance` | Library | Catalog, status policy, metadata paths |
| Queue parsing and pending-work selection | `tooling/work-queue` | Library | Queue format, prompts, workflow transitions |
| Ordered release command execution | `tooling/release` | Library | Command sequence and release policy |
| Child processes, ports, and configured suites | `tooling/runners` | Library | Suite map, environment, browser package, exit policy |
| Production container update engine | `bash/update-production-server.sh` | Shell runner | Git pull/bootstrap, env and compose paths, service name, health contract, credentials, topology |

## Production Update Contract

Run production updates from the consumer repository:

```bash
bash/update-production-server.sh
```

The consumer wrapper is intentionally small. It owns the branch, verifies a
clean checkout, pulls the product repository, and runs:

```bash
git submodule sync --recursive
git submodule update --init --recursive --progress
```

Only after bootstrap may it call the pinned core runner. The wrapper passes
`--project-root`, `--env-file`, `--compose-file`, `--service`, and health
settings explicitly. Do not invoke the nested core script directly on a
production host: doing so bypasses product Git/bootstrap policy and makes the
deployment depend on an already-initialized submodule.

The core runner never pulls Git, selects a product branch, guesses credentials,
or defines Compose services. It never prunes Docker volumes.

## Adding A Shared Command

1. Put reusable behavior under `src/tooling/` with a matching `.d.ts` file.
2. Keep the behavior callable as a library function for tests and composition.
3. Register only universal entry points in `src/tooling/cli.js`.
4. Require `--repo-root`; resolve all relative paths from it.
5. Add the package export and, when needed, use the existing
   `backpack-game-core` bin rather than adding another executable.
6. Add the same short npm alias to Mushroom and Meat when both expose the
   command. Product aliases are the public command surface for agents.
7. Update this route table and both consumer command manifests/readmes.
8. Test the CLI in core and invoke each consumer alias from its own root.

Do not teach agents to run `vendor/backpack-game-core/src/...` or
`vendor/backpack-game-core/bin/...` directly. Those are physical checkout
paths, not the consumer command API.
