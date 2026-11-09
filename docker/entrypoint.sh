#!/usr/bin/env bash
# Entrypoint della devbox web Tradenza (modalita' dev).
# Parte come root, poi re-exec come utente `node` (uid 1000) via gosu.
#   1. applica le migrazioni Drizzle (se il DB e' pronto, con retry)
#   2. avvia `next dev` con hot reload, in ascolto su 0.0.0.0:PORT
set -u

export HOME=/home/node
export NODE_ENV=development

if [ "$(id -u)" = "0" ]; then
  chown node:node /home/node 2>/dev/null || true
  exec gosu node "$0" "$@"
fi

cd /app

log() { printf '[entrypoint] %s\n' "$*" >&2; }

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    log "DATABASE_URL non impostata: salto le migrazioni."
  else
    log "applico le migrazioni Drizzle..."
    node scripts/docker-migrate.mjs || log "WARNING: migrazioni fallite (DB non pronto?). Avvio comunque."
  fi
fi

log "avvio next dev su 0.0.0.0:${PORT:-3000}"
exec npm run dev -- -H 0.0.0.0 -p "${PORT:-3000}"
