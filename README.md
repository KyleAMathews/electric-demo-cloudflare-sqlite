# electric-demo-cloudflare-sqlite

Demo showing how to sync into Cloudflare's new Durable Object SQLite

Edge compute is great but compute with slow data reads isn't great.

Sync is the solution.

Electric gives Durable Objects a high-performance flexible sync from Postgres into the the new DO SQLite.

The DO makes an incremental sync call for the latest changes on each call (can take < 20ms when responses cached in the CDN) and then query the local db (will support up to 10 GBs).

Each Durable Object can have a full synced copy of the data it needs to do its work. This is the key to unlocking the potential of edge compute.

Edge Compute 🤝 Synced Data

## How to run
1. `npm run backend:up`
2. `npx wrangler dev`
3. open browser to /org/${id}
