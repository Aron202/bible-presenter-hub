<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Cursor Cloud specific instructions

Sermon Slide Studio is one local TanStack Start app. Bible text and slide themes stay in the browser (`localStorage`). There is no database, login, or required secret.

- Install with Bun so the lockfile is honored: `bun install --frozen-lockfile` (`bun.lock`, `bunfig.toml`). Put `bun` and `bunx` on the default PATH via `/usr/local/bin`.
- Dev server: `bun run dev`. `@lovable.dev/vite-tanstack-config` binds host `::` and port `8080` with `strictPort`.
- `bun run build` is the production build.
- `bun run lint` and `bunx tsc --noEmit` currently fail on existing Prettier formatting and `exactOptionalPropertyTypes` errors in app source. The toolchain itself runs.
- Hello-world check: Settings → upload `fixtures/sample-bible.txt` → Builder → paste an outline that includes `Johannes 3:16-18` → Generate blocks → Export to ProPresenter (downloads a `.pro6` file). The library survives a reload; in-memory sermon blocks do not.
