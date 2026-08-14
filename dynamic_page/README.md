# Typing Speed Test

A 60-second typing test. React + TypeScript on the front, Express behind it, with
passages built from live quotes off [zenquotes.io](https://zenquotes.io/).

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

**That's it — no database required.** Results are kept in memory and disappear when
the server restarts. To make them persist, see
[Optional: persisting results](#optional-persisting-results) below.

Two processes start together:

- Client: <http://localhost:3000> (Vite, which also proxies `/api` to the server)
- API: <http://localhost:4000>

## How the test works

- A square holds the countdown; it starts at 60 and runs when you press **Start test**.
- **Pause** freezes the clock and ignores keystrokes; **Resume** picks up at the exact
  second you left off, so a pause costs you nothing.
- Each character you type correctly turns dark, left to right.
- A wrong key **does not advance the cursor**. The character stays light and gains a
  red wash until you type the right one, so a mistake can never be mistaken for progress.
- The box beside the timer counts correct characters live.
- At zero seconds a popup shows how many words you typed, and the run is saved.
- Below the passage, **Past runs** lists the last ten attempts: when, and how fast.
  A run where nothing was typed is shown but not saved.
- A toggle on that list switches which database the rows are **read** from, so you
  can confirm the same run landed in both.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Client and API together |
| `npm run dev:client` / `dev:server` | Either half on its own |
| `npm run typecheck` | `tsc` over both the client and the server |
| `npm run build` | Typecheck, then build the client to `dist/` |

## How it is put together

```
index.html            Tailwind CDN + theme tokens + fonts
src/
  App.tsx             wires the clock, the engine, the modal and the chart
  hooks/
    useCountdown.ts   deadline-based 60s clock, pause/resume (does not drift)
    useTypingEngine.ts passage building + the no-advance-on-error rule
  components/         TimerBox, ScoreBox, Passage, ResultModal, HistoryList
  lib/                api client + shared types
server/
  index.ts            /api/health, /api/quotes, POST + GET /api/results
  quotes.ts           zenquotes proxy, 5-minute cache, ASCII folding
  fallbackQuotes.ts   used when zenquotes is unreachable
  stores/
    types.ts          the ResultStore contract both databases implement
    mongoStore.ts     Atlas: document insert, sort by createdAt
    postgresStore.ts  SQL: schema on boot, snake_case <-> camelCase mapping
    memoryStore.ts    fallback when neither database is configured
    index.ts          StoreRegistry -- fans writes out, reads from one source
```

### Two more things worth knowing

**Quotes are proxied, not fetched from the browser.** zenquotes.io sends no CORS
headers, so a direct `fetch` from the page fails. The server fetches instead and
caches for five minutes — their limit is about 5 requests per 30 seconds per IP,
and one cache serves every visitor. Curly quotes and em dashes are folded to ASCII
first, because a character you cannot produce with a keypress is impossible to type.

**WPM is correct characters ÷ 5.** The standard definition of a "word" for typing
tests. The run is exactly 60 seconds, so no time normalization is needed. The
server recomputes it from the raw counts rather than trusting the client.

## Optional: persisting results

Everything above works without this section. Configure a database only if you want
results to survive a restart.

Every finished test is written to **every** database you configure, and the **Past
runs** list can be read from either one — so you can confirm the same run landed in
both. Both are optional and independent: configure neither and the server uses the
in-memory store; configure one and it uses that one; configure both and every result
goes to both.

Start by creating your `.env`:

```bash
cp .env.example .env      # PowerShell, macOS, Linux
copy .env.example .env    # Windows cmd.exe
```

Then fill in `MONGODB_URI` and/or `DATABASE_URL` and restart the server. Check which
are live:

```bash
curl http://localhost:4000/api/health
# {"sources":[{"id":"mongo","label":"MongoDB Atlas"},
#             {"id":"postgres","label":"Postgres"}],"defaultSource":"mongo"}
```

### Setting up MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a database user, and note its password.
3. **Network Access** → add your current IP (or `0.0.0.0/0` while developing).
4. **Connect** → **Drivers** → **Node.js** → copy the connection string.
5. Paste it into `MONGODB_URI` in `.env`, replacing `<password>` with the real one.
   URL-encode any of `@ : / ? # [ ] %` in the password.
6. Restart the server. You should see `[mongo] Connected to Atlas -> …`.

The database and collection are created on first write; no setup needed there.

### Setting up Postgres

Local, or hosted on Neon / Supabase / Railway — either works.

```bash
createdb typing_speed_test
# then in .env:
# DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/typing_speed_test
```

The `results` table and its index are created automatically on boot, so there is
no migration step. TLS is enabled automatically for any non-localhost host, which
is what hosted providers require. Restart and look for
`[postgres] Connected and schema ready -> public.results`.

### How the two databases fit together

The whole trick is one interface, `ResultStore` in `server/stores/types.ts`:

```ts
insert(result: TestResult): Promise<void>
recent(limit: number): Promise<TestResult[]>   // always oldest-first
```

Mongo and Postgres each implement it, so the route handlers never learn which
kind of database they are talking to. `StoreRegistry` holds every store that
connected and does two things:

- **Writes** go to all of them, via `Promise.allSettled` — not `Promise.all`.
  One database being down must not lose the write to the other, and must not
  fail the request. The response carries a per-store report:

  ```json
  { "result": { "wpm": 48, … },
    "writes": [ {"store":"mongo","outcome":"ok"},
                {"store":"postgres","outcome":"error","error":"…"} ] }
  ```

  The request only 500s if *every* database rejected it.

- **Reads** come from one named store: `GET /api/results?source=postgres`.
  An unknown or unconfigured source quietly falls back to the default rather
  than erroring, and the response echoes which one actually served it.

Two details that matter for the data matching across both:

- The `TestResult` is built **once** in the route, before the fan-out, so the
  `createdAt` timestamp and derived `wpm` are byte-identical in both databases.
  Deriving them per-store would drift.
- `MongoStore.insert` spreads the object (`{ ...result }`) before handing it to
  the driver, because the Mongo driver mutates its argument to attach `_id`.
  Without the copy, Postgres would receive a polluted object.

### Stored result

Anonymous — no accounts, no names. The same run, in each database:

**MongoDB** — `typing_speed_test.results`

```js
{ _id, wpm: 48, correctChars: 240, errors: 6,
  accuracy: 0.9756, durationSec: 60, createdAt: ISODate("…") }
```

**Postgres** — `public.results`

```sql
id BIGSERIAL | wpm INTEGER | correct_chars INTEGER | errors INTEGER
             | accuracy REAL | duration_sec INTEGER | created_at TIMESTAMPTZ
```

Postgres columns are snake_case by convention; `postgresStore.ts` maps them back
to the camelCase `TestResult` the rest of the app uses, so the API response is
identical no matter which database served it.
