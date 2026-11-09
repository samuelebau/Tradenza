# Devbox per l'app web Tradenza (Next.js 15 + Postgres) — modalita' DEV.
# Mono-utente (uid 1000 `node`), nessuna autenticazione: AUTH_DISABLED=1
# bypassa Clerk lato server (vedi src/lib/dev/auth.ts e docker/README.md).
# Nessun VNC: e' un'app web, si apre direttamente nel browser.
#
#   make up   ->  http://localhost:3000/dashboard
FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=development \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    HUSKY=0 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gosu \
    && rm -rf /var/lib/apt/lists/*

# L'immagine node:22-bookworm-slim ha gia' l'utente `node` con uid 1000:
# lo riusiamo (coincide con l'uid dell'host). `gosu node` nell'entrypoint
# scende a questo utente.

WORKDIR /app

COPY package.json package-lock.json ./
# WORKDIR /app e' stata creata da root: chown a node, altrimenti npm (utente
# node) non puo' scriverci node_modules.
RUN chown -R node:node /app
USER node
RUN npm ci --no-audit --no-fund

USER root
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Volume anonimo: preserva i node_modules dell'immagine dal bind-mount
# del sorgente (..:/app) che altrimenti li nasconderebbe.
VOLUME ["/app/node_modules"]

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
