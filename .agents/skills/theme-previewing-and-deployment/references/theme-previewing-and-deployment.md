# Theme Previewing And Deployment Reference

## Scope

- Run CLI commands from the repository root.
- Edit theme code in `src/`.
- Do not edit `dist/` manually.
- Treat this theme as a direct Liquid / JSON / CSS theme for implementation work.
- Prefer `--non-interactive` commands for agent workflows.
- Treat `dist/` as the staged upload artifact.

## How to invoke the CLI

Use either:

```bash
npx tiendu <command> ...
```

or:

```bash
tiendu <command> ...
```

If the CLI is not installed globally, prefer:

```bash
npx tiendu <command> ...
```

If the CLI is installed globally, that usually means it was installed with:

```bash
npm install -g tiendu
```

## Recommended workflow

1. Initialize the CLI with credentials.
2. Select the target store if one was not auto-selected.
3. Pull the current live theme when you need to sync local files with the store.
4. Make code changes in `src/`.
5. Push to a preview for verification.
6. Publish only when the user explicitly asks for it.

## Initialize the CLI

```bash
tiendu init <api-key> [base-url] --non-interactive
```

The default `base-url` points to the Tiendu platform and rarely needs to change.

The seller can obtain the API_KEY by logging into Tiendu ([tiendu.uy/acceso](https://tiendu.uy/acceso)), navigating to Ajustes > General, in the "Riesgoso" Section.

If you need a copy-only pipeline config, start from `tiendu.config.example.json`.

## Select the store

```bash
tiendu stores list --non-interactive
tiendu stores set <store-id> --non-interactive
```

If the seller only has one store, then that store will be selected automatically. The tiendu init will provide a list of all available stores.

## Preview workflow

```bash
tiendu preview create "agent-preview" --non-interactive
tiendu preview list --non-interactive
tiendu preview attach <preview-key> --non-interactive
tiendu push --non-interactive
tiendu push <preview-key> --non-interactive
```

## Sync the current theme

```bash
tiendu pull --non-interactive
tiendu pull <preview-key> --non-interactive
```

What `pull` does:

- Resets `dist/` first.
- Extracts the downloaded live theme or preview into `dist/`.
- Leaves `src/` untouched.

Use `pull` when you want the local staged artifact to match the remote theme exactly.

Do not use `pull` as a way to restore source files in `src/`.

## Local artifact behavior

`push` uploads the staged `dist/` artifact, not the `src/` source tree directly.

That means:

- `build` prepares `dist/`
- `push` zips and uploads `dist/`
- `publish` builds or reuses `dist/`, syncs it to the preview, and then publishes

Optional pipeline steps come from `tiendu.config.json`.

Example copy-only config:

```json
{
  "pipeline": {
    "compileScripts": false,
    "compileStyles": false,
    "postcss": false
  }
}
```

With all steps disabled, the CLI still stages the theme into `dist/`, but it skips script/style compilation and PostCSS.

## Publish workflow

Publish only when the user explicitly requests it:

```bash
tiendu publish --non-interactive
tiendu publish <preview-key> --non-interactive
```

## Common failure cases

- `no store selected`: run `tiendu stores list --non-interactive` and `tiendu stores set <store-id> --non-interactive`
- `no preview selected`: run `tiendu preview create <name> --non-interactive` or `tiendu preview attach <preview-key> --non-interactive`
- credential errors during `init` or `stores list`: rerun `tiendu init <api-key> [base-url] --non-interactive`
