# Tradenza devbox — documentazione tecnica

La devbox Tradenza e' una **devbox web** (non un desktop via VNC come
`platforms/motivewave`): gira l'app Next.js in `next dev` con il sorgente
bind-mountato (hot reload) e la espone su `http://localhost:3000`. Stack:
**Node 22** + **Next.js 15** (dev) + **Postgres 16**, mono-utente, senza
autenticazione. Per l'uso quotidiano vedi `DEVBOX.md`.

## Perche' web e non desktop
Il monorepo e' nato per ospitare **app desktop** (.deb) servite via VNC/noVNC
(vedi `CONTEXT.md` e `platforms/motivewave`). Tradenza e' una **web app**: serve
un browser, non un desktop virtuale. La devbox analoga espone la porta HTTP —
niente Xvfb/openbox/x11vnc/noVNC.

## Stack
| Pezzo       | Immagine                | Note                          |
|-------------|-------------------------|-------------------------------|
| App (dev)   | `node:22-bookworm-slim` | `tm_tradenza:latest`          |
| Postgres    | `postgres:16-alpine`    | volume `tm_tradenza_db-data`   |
| Next.js     | 15 (`next dev`)         | hot reload via bind-mount      |
| Drizzle ORM | migrazioni da `drizzle/`| `scripts/docker-migrate.mjs`   |

## Persistenza
- **DB (A)** — volume `tm_tradenza_db-data`: tutti i dati dell'app. Cancellato con `make purge`.
- **Workspace (B)** — `platforms/tradenza/workspace/` → `/home/node/workspace`: file locali utente. Preservato da `make purge`.

## Mono-utente e senza autenticazione
- **`AUTH_DISABLED=1`** (dal compose) bypassa Clerk lato server. I tre helper
  server di Clerk (`auth()`, `currentUser()`, `clerkClient()`) sono sostituiti
  da uno shim in `src/lib/dev/auth.ts` che restituisce sempre lo **stesso
  utente dev** (`DEV_USER_ID`, default `user_dev_local`).
- Il **middleware** (`src/middleware.ts`) con `AUTH_DISABLED=1` salta
  `clerkMiddleware` e applica solo il CSP.
- **Clerk sul client** resta montato con una publishable key sentinel valida
  come formato ma non funzionale. Effetto solo **cosmetico** (landing nav
  mostra "Sign in", `UserButton` vuoto, PostHog non identifica). Tutti i
  **dati** passano dal codice server, che usa l'identita' dev.

### Identita' dev (personalizzabile)
| Variabile              | Default             | Scopo                          |
|------------------------|---------------------|--------------------------------|
| `AUTH_DISABLED`        | `1`                 | Attiva/disattiva il bypass    |
| `DEV_USER_ID`          | `user_dev_local`    | Id dell'unico utente           |
| `DEV_USER_EMAIL`       | `dev@tradenza.local`| Email (per `ADMIN_EMAILS`)     |
| `DEV_USER_FIRST_NAME`  | `Dev`               | Nome                           |
| `DEV_USER_LAST_NAME`   | `User`              | Cognome                        |
| `DEV_USERNAME`         | `dev`               | Username                       |

Per riusare un data set reale: `make up DEV_USER_ID=<clerk_id>`.
Per l'area `/admin`: `make up ADMIN_EMAILS=dev@tradenza.local`.

### Com'e' implementato il bypass
Lo shim `src/lib/dev/auth.ts` esporta `auth`, `currentUser`, `clerkClient`
con gli **stessi tipi** di Clerk: con `AUTH_DISABLED !== '1'` delegano
verbatim agli helper reali (production, test, normal local dev con chiavi
Clerk vere **inalterati**); con `AUTH_DISABLED === '1'` restituiscono
l'identita' dev. I 11 call site server importano da `@/lib/dev/auth`. Il
middleware smista fra `clerkMiddleware` (reale) e un handler solo-CSP (dev).

### Limiti noti in dev-no-auth
- `/admin`: `isAdmin()` vede l'utente dev; admin abilitato solo se
  `DEV_USER_EMAIL` e' in `ADMIN_EMAILS`.
- Webhook Clerk: mai chiamati in dev. La riga `users` e' creata dal
  just-in-time provisioning (`ensureUserRecord`) al primo caricamento.
- Cancellazione account (`DangerZone`): `clerkClient.users.deleteUser` e' un
  no-op (stub); i dati DB vengono comunque purgati.

## Rete
`network_mode: host` (come `platforms/motivewave`): su questo host il
port-forwarding di Docker non funziona con la VPN attiva. Con host network
l'app ascolta su `APP_PORT` (default 3000) e Postgres su `POSTGRES_PORT`
(default 5432). Niente `ports:` (incompatibile con host network).

> Sicurezza: devbox per uso **locale**. Con host network + no-login non
> esporla su rete non fidata. Per uso remoto usa tunnel SSH o reverse proxy
> con auth.

## Healthcheck
`app` ha healthcheck su `http://127.0.0.1:APP_PORT/api/health` (verifica anche
Postgres `SELECT 1`). `start_period: 60s` perche' il primo `next dev` compila.

## Migrazioni
`scripts/docker-migrate.mjs` applica le migrazioni in `drizzle/` all'avvio con
retry. Nuove migrazioni: `make db-generate`. Riapplicare: `make migrate`.

## File della devbox
```
platforms/tradenza/
├── Makefile                 comandi (tutto via Docker)
├── DEVBOX.md                quick-start
├── docker/
│   ├── Dockerfile           immagine dev (Node 22)
│   ├── docker-compose.yml   app + Postgres (project tm_tradenza)
│   ├── entrypoint.sh        migrazioni -> next dev
│   ├── .env.example         configurazione opzionale
│   └── README.md            questo file
└── workspace/               dati utente (B)
```
Il `Dockerfile`/`docker-compose.yml` alla radice sono quelli di **produzione**
upstream; la devbox usa i propri in `docker/`.
