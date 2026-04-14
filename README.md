# Command Center

[![Deploy](https://github.com/WCLogic/command-center/actions/workflows/deploy.yml/badge.svg)](https://github.com/WCLogic/command-center/actions/workflows/deploy.yml)

Executive operations dashboard for Mr. Chase's business portfolio. Pulls data from a private Google Sheet via a Cloudflare Worker proxy and renders it as a dark-themed React SPA.

**Live:** https://wclogic.github.io/command-center/

## Architecture

```
┌─────────────────────────────┐       ┌───────────────────────────┐       ┌──────────────────┐
│  wclogic.github.io          │       │  Cloudflare Worker        │       │  Google Sheets   │
│  /command-center            │──────▶│  command-center-api       │──────▶│  (private)       │
│  (React SPA on GH Pages)    │  CORS │  JWT → OAuth → Sheets API │  SA   │                  │
└─────────────────────────────┘       └───────────────────────────┘       └──────────────────┘
```

- Frontend: React + Vite + Tailwind v4 + react-router-dom
- Backend: Cloudflare Worker (service-account-authenticated proxy)
- Data: Google Sheet `1IGTix-G39YllqcH7DEnX9NSsJrVHdBrt3TV1kSQkGBA`
- Auth: Service Account (sheet stays private; Worker holds the only credential)

## Structure

- `frontend/` — React app, deployed to GitHub Pages
- `worker/` — Cloudflare Worker, deployed via wrangler
- `.secrets/` — Service account JSON (gitignored)
- `COMMAND_CENTER_SPEC.md` — Full system specification (in `~/Agents/Jarvis - EA/`)

## Deploy

**Frontend:** Automated via GitHub Actions on every push to `main` — see `.github/workflows/deploy.yml`. The workflow builds `frontend/` and force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves at the live URL above.

**Worker:** Manual — `cd worker && npx wrangler deploy`. See `worker/README.md`.
