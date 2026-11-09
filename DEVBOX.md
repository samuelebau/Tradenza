# Tradenza devbox

Devbox **web** per [Tradenza](https://github.com/samuelebau/tradenza) — il
trading journal open source (Next.js 15 + Postgres). Mono-utente, senza
autenticazione: si avvia con un comando e si usa subito, senza account Clerk.

> A differenza di `platforms/motivewave` (un desktop via VNC), questa e' una
> **devbox web**: l'app gira in `next dev` e si apre su `http://localhost:3000`.
> Per i dettagli tecnici vedi `docker/README.md`.

## Avvio rapido

```bash
cd platforms/tradenza
make up          # avvia app + Postgres (build la prima volta, ~2-3 min)
make web         # apre http://localhost:3000/dashboard nel browser
```

Non serve nessun login: la devbox gira in modalita' mono-utente (vedi "Auth").

## Comandi principali

```bash
make up            # avvia in background (app + Postgres)
make up-fg         # idem, log in primo piano (Ctrl+C ferma)
make down          # ferma e rimuove i container (mantiene DB + workspace)
make ps            # stato container (deve dire Up / healthy)
make logs          # segue i log dell'app  (SERVICE=db per il Postgres)
make shell         # bash nel container dell'app
make db-shell      # psql nel Postgres (db `tradenza`, user `tradenza`)
make web           # apre l'app nel browser
make help          # lista completa
```

Sviluppo:

```bash
make migrate       # applica le migrazioni Drizzle
make db-generate   # genera una migrazione da src/lib/db/schema.ts
make lint          # next lint
make typecheck     # tsc --noEmit
make test          # vitest run
make install       # npm install (per nuove dipendenze)
```

Reset:

```bash
make reset-db         # cancella tutti i dati del DB (mantiene container)
make purge            # ferma i container E cancella il volume del DB
make reset-workspace  # svuota workspace/ (dati utente)
```

## Porte

| Servizio  | Var              | Default | Note                                  |
|-----------|------------------|---------|---------------------------------------|
| App       | `APP_PORT`       | 3000    | `http://localhost:3000`               |
| Postgres  | `POSTGRES_PORT`  | 5432    | `127.0.0.1:5432`, user/db `tradenza`  |

Override: `make up APP_PORT=3100 POSTGRES_PORT=5433`.

## Auth: mono-utente, senza login

La devbox gira con `AUTH_DISABLED=1`: l'app si comporta come se ci fosse un
singolo utente gia' autenticato (`DEV_USER_ID`, default `user_dev_local`),
senza passare da Clerk. Tutti i dati creati sono associati a questo utente dev.

- Per **riusare un data set reale**: `make up DEV_USER_ID=<clerk_user_id>`
- Per **abilitare l'area `/admin`**: `make up ADMIN_EMAILS=dev@tradenza.local`
- Per usare **Clerk reale**: `AUTH_DISABLED=0` + chiavi Clerk in `docker/.env`

Dettagli: `docker/README.md` → "Mono-utente e senza autenticazione".

## Configurazione (opzionale)

Tutto ha un default: `make up` funziona senza alcun `.env`.

```bash
cp docker/.env.example docker/.env
# edita docker/.env, poi:
make up
```

## Struttura

```
platforms/tradenza/        (repository upstream Tradenza + devbox)
├── Makefile               comandi devbox
├── DEVBOX.md              questo quick-start
├── docker/                devbox (Dockerfile/compose/entrypoint/README)
├── workspace/             dati utente (B)
├── src/  drizzle/  ...    sorgente dell'app (upstream)
├── Dockerfile             ← upstream: immagine di PRODUZIONE (non usata dalla devbox)
└── docker-compose.yml     ← upstream: compose di PRODUZIONE (non usato dalla devbox)
```

I `Dockerfile`/`docker-compose.yml` alla radice sono quelli di produzione del
progetto upstream; la devbox usa i propri in `docker/`.
