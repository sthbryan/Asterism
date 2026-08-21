<h1 align="center">Asterism</h1>

<p align="center">
  <img src="./assets/brand/asterism-icon.svg" alt="Asterism" width="112" height="112" />
</p>

<p align="center">
  <strong>GitHub stats for the repos you actually track.</strong>
</p>

<p align="center">
  Stars, forks, and release downloads for a set you pick.<br />
  Asterism talks to GitHub through <code>gh</code>.<br />
  Nothing is tracked until you mark it.
</p>

<p align="center">
  <a href="https://github.com/sthbryan/Asterism/releases">Download</a>
  ·
  <a href="#get-it">Install</a>
</p>

---

Asterism does not list every repository you own. You choose the set, the selection lives in `~/.config/asterism/config.json`, and the window shows stars, forks, and download totals for that set. Open a repo and you get traffic, languages, each release, and each asset.

It uses the GitHub CLI you already signed in with. If `gh` is missing or not authenticated, the app stops and tells you why.

---

## What it actually does

**Only the repos you mark**  
The picker lists your user and org repositories. Toggles persist. Unmarked repos stay out of the way.

**List first, detail when you need it**  
Overview: stars, forks, total release downloads. Detail: watchers, issues, last push, 14-day views and clones, languages, and every release with per-asset counts.

**`gh` is the client**  
No extra GitHub token in the app. Asterism shells out to `gh` with the account already configured on the machine.

**Selection survives a restart**  
Config at `~/.config/asterism/config.json`. Last fetch at `~/.cache/asterism/cache.json`, so the list is not empty while a refresh runs.

---

## Built for

- People who ship releases and want download counts without opening every GitHub page
- A small set of repos that matter, not a dump of everything you fork
- Anyone already living in `gh` who wants a desktop view of the same data

---

## Get it

**From source**

```bash
bun install
bun run tauri dev
```

| | |
|---|---|
| **Download** | [GitHub Releases](https://github.com/sthbryan/Asterism/releases) |
| **From source** | `bun install`, then `bun run tauri dev` |
| **Icons** | `bun run icons` |

Asterism needs [GitHub CLI](https://cli.github.com) (`gh`) installed and signed in (`gh auth login`). It does not replace `gh`. It reads through it.

---

## Architecture

- `src-tauri`: Tauri v2 host. Detects `gh`, loads config, fetches catalog, tracked stats, and repo detail off the UI thread.
- `src`: React client. Overview, repo picker, and detail.
- `~/.config/asterism/config.json`: tracked `owner/name` list.
- `~/.cache/asterism/cache.json`: last successful fetch.

`gh` owns auth and the GitHub API. The app is a thin desktop client over that CLI.

---

<p align="center">
  <sub>MIT License</sub>
</p>
