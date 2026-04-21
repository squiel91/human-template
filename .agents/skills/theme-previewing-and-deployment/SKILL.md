---
name: theme-previewing-and-deployment
description: Use this skill when work in the official Tiendu base theme involves Tiendu CLI setup, selecting a store, preview creation or attachment, pulling theme files, pushing changes, or publishing live.
---

# Theme Previewing And Deployment

<when-to-use>
Use this skill for CLI-driven preview, sync, and deployment work.

Typical cases:

- CLI initialization
- store selection
- theme pull
- preview create or attach
- push
- publish
  </when-to-use>

<workflow>
1. Run CLI commands from the repository root.
2. Prefer `--non-interactive` commands for agent work.
3. Edit `src/`, not `dist/`.
4. Treat `dist/` as the staged upload artifact.
5. Use preview flows for validation.
6. Publish only when the user explicitly asks.
</workflow>

<quality-bar>
- Keep local theme files in sync when required with `pull`.
- Do not treat `pull` as a source reset for `src/`; it refreshes `dist/`.
- Avoid long-running `tiendu dev` sessions unless explicitly requested.
- Treat publish as a deliberate final action.
</quality-bar>

<references>
- `references/theme-previewing-and-deployment.md`
</references>
