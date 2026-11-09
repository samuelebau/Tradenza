# Makefile della devbox "Tradenza" — app web Next.js in dev.
# Vive alla radice della platform: invocarlo da qui (`cd platforms/tradenza && make ...`).
# Tutti i target girano via Docker: non serve Node/npm/Postgres sull'host.

COMPOSE := docker compose -f docker/docker-compose.yml
SERVICE := app
DB_SVC  := db
APP_PORT   ?= 3000
POSTGRES_PORT ?= 5432
export APP_PORT POSTGRES_PORT

.DEFAULT_GOAL := help

.PHONY: help
help: ## Mostra questo elenco dei target
	@awk 'BEGIN {FS = ":.*##"; printf "\n\033[1mTradenza devbox - comandi disponibili\033[0m\n\n"} \
		/^[a-zA-Z0-9_./-]+:.*##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Setup
.PHONY: init
init: ## Precrea le cartelle utente workspace/ (gruppo B) se mancano
	@mkdir -p workspace/workspaces workspace/output workspace/download workspace/import
	@touch workspace/.gitkeep workspace/workspaces/.gitkeep workspace/output/.gitkeep \
	      workspace/download/.gitkeep workspace/import/.gitkeep
	@echo "workspace/ pronto."

##@ Devbox (runtime)
.PHONY: up
up: init build ## Avvia app + Postgres in background (build dell'immagine se serve)
	$(COMPOSE) up -d
	@echo
	@echo "App:   http://localhost:$(APP_PORT)/dashboard"
	@echo "Health: http://localhost:$(APP_PORT)/api/health"

.PHONY: up-fg
up-fg: init build ## Avvia in primo piano (log visibili, Ctrl+C per fermare)
	$(COMPOSE) up

.PHONY: down
down: ## Ferma e rimuove i container (mantiene i volumi: DB e workspace)
	$(COMPOSE) down

.PHONY: restart
restart: ## Riavvia l'app (ricarica .env e sorgente)
	$(COMPOSE) restart $(SERVICE)

.PHONY: stop
stop: ## Ferma i container senza rimuoverli
	$(COMPOSE) stop

.PHONY: start
start: ## Avvia container gia' creati (senza rebuild)
	$(COMPOSE) start

.PHONY: logs
logs: ## Segue i log dell'app (o SERVICE=db per il Postgres)
	$(COMPOSE) logs -f $(SERVICE)

.PHONY: ps
ps: ## Stato dei container
	$(COMPOSE) ps

.PHONY: status
status: ps ## Alias di ps

.PHONY: shell
shell: ## Apre una shell bash nel container dell'app
	$(COMPOSE) exec $(SERVICE) bash

.PHONY: exec
exec: ## Esegue un comando nell'app: make exec CMD="npm run lint"
	$(COMPOSE) exec $(SERVICE) $(CMD)

.PHONY: web
web: ## Apre l'app nel browser (http://localhost:APP_PORT/dashboard)
	@URL="http://localhost:$(APP_PORT)/dashboard"; \
	if command -v xdg-open >/dev/null 2>&1; then xdg-open "$$URL"; \
	elif command -v open >/dev/null 2>&1; then open "$$URL"; \
	else echo "Apri manualmente: $$URL"; fi

.PHONY: db-shell
db-shell: ## Apre psql nel Postgres della devbox (db: tradenza, user: tradenza)
	$(COMPOSE) exec $(DB_SVC) psql -U tradenza -d tradenza

##@ Build immagini
.PHONY: build
build: ## Builda l'immagine dell'app (usa la cache se disponibile)
	$(COMPOSE) build

.PHONY: rebuild
rebuild: ## Builda da zero l'immagine dell'app (no cache)
	$(COMPOSE) build --no-cache

##@ Sviluppo (dentro il container)
.PHONY: install
install: ## npm install nel container (per aggiungere/modificare dipendenze)
	$(COMPOSE) exec $(SERVICE) npm install

.PHONY: migrate
migrate: ## Applica le migrazioni Drizzle (node scripts/docker-migrate.mjs)
	$(COMPOSE) exec $(SERVICE) node scripts/docker-migrate.mjs

.PHONY: db-generate
db-generate: ## Genera una nuova migrazione da src/lib/db/schema.ts (drizzle-kit)
	$(COMPOSE) exec $(SERVICE) npm run db:generate

.PHONY: db-studio
db-studio: ## Avvia Drizzle Studio
	$(COMPOSE) exec $(SERVICE) npm run db:studio

.PHONY: lint
lint: ## Esegue next lint nel container
	$(COMPOSE) exec $(SERVICE) npm run lint

.PHONY: typecheck
typecheck: ## Esegue tsc --noEmit nel container
	$(COMPOSE) exec $(SERVICE) npm run typecheck

.PHONY: test
test: ## Esegue vitest nel container
	$(COMPOSE) exec $(SERVICE) npm run test:run

##@ Reset stato
.PHONY: purge
purge: down ## Ferma i container E cancella il volume del DB (riparte da zero)
	$(COMPOSE) down -v
	@echo "Volume DB cancellato. I dati utente in workspace/ sono preservati."

.PHONY: reset-db
reset-db: ## ATTENZIONE: cancella tutti i dati del DB. Mantiene il container.
	@read -r -p "Cancellare tutti i dati del DB di dev? [s/N] " ans; [ "$$ans" = "s" ] || { echo "Annullato."; exit 1; }
	$(COMPOSE) exec -T $(DB_SVC) psql -U tradenza -d tradenza -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "Schema public ricreato. Riapplica con: make migrate"

.PHONY: reset-workspace
reset-workspace: ## ATTENZIONE: svuota workspace/ (dati utente). Mantiene DB e container.
	@read -r -p "Svuotare workspace/ ? [s/N] " ans; [ "$$ans" = "s" ] || { echo "Annullato."; exit 1; }
	rm -rf workspace/workspaces/* workspace/output/* workspace/download/* workspace/import/*
	@echo "workspace/ svuotato."

##@ Manutenzione
.PHONY: prune
prune: ## Rimuove immagini, container e reti non usati da Docker
	docker system prune -f

.PHONY: clean
clean: down ## Alias di down (mantiene i volumi)

.PHONY: check
check: ## Verifica la configurazione del compose (lista servizi)
	$(COMPOSE) config --services
