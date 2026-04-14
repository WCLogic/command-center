# Command Center API — Cloudflare Worker

Private proxy between the React app and the Google Sheet. Holds the service-account credential; signs a JWT per request (cached 1h), exchanges it for an OAuth access token, and calls the Sheets API.

## One-time setup (Mr. Chase runs on his Mac)

```bash
cd ~/command-center/worker
npm install -g wrangler                # if not already
wrangler login                         # opens browser; sign in as willchasecreate
```

## Store the service-account secret

The JSON is currently at `~/command-center/.secrets/service-account.json`. Pipe it in so the multi-line private_key survives untouched:

```bash
cd ~/command-center/worker
cat ../.secrets/service-account.json | wrangler secret put GOOGLE_SERVICE_ACCOUNT
```

Wrangler will accept the stdin content. If it errors on "tty required", run interactively and paste the JSON on one line with `\n` preserved — but piping is the reliable path.

## Deploy

```bash
cd ~/command-center/worker
npx wrangler deploy
```

Wrangler prints the Worker URL, e.g. `https://command-center-api.<your-subdomain>.workers.dev`. Copy that URL — the frontend needs it as `VITE_API_URL`.

## Endpoints

| Method | Path          | Body / Params                                      | Purpose                               |
| ------ | ------------- | -------------------------------------------------- | ------------------------------------- |
| GET    | `/health`     |                                                    | Liveness check                        |
| GET    | `/all`        |                                                    | Read all 5 tabs in one batch call     |
| GET    | `/?tab=<n>`   | `?tab=Leads%20%26%20Outreach`                      | Read a single tab                     |
| POST   | `/`           | `{ tab, values, mode: 'append' }`                  | Append rows to tab                    |
| POST   | `/`           | `{ tab, range, values, mode: 'update' }`           | Update an A1 range within a tab       |
| POST   | `/cell`       | `{ tab, row, col, value }` (1-based)               | Update a single cell                  |

CORS is locked to `https://wclogic.github.io`.

## Quick test after deploy

```bash
curl https://command-center-api.<sub>.workers.dev/health
curl https://command-center-api.<sub>.workers.dev/all
```

If `/all` returns 500 with "Token exchange failed", the service account doesn't have access to the Sheet. Re-share the Sheet with the `client_email` from the JSON.
