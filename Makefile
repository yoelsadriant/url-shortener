BACKEND  := services/backend
FRONTEND := services/frontend
COMPOSE  := docker compose -f $(BACKEND)/compose.yml

.DEFAULT_GOAL := help

PORTS    := 3000 5173

.PHONY: help install env ddb-up ddb-down ddb-logs init backend frontend dev down clean clean-port test test-e2e

help:
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-14s\033[0m %s\n",$$1,$$2}' $(MAKEFILE_LIST)

install: ## Install backend + frontend deps
	npm --prefix $(BACKEND) install
	npm --prefix $(FRONTEND) install

env: $(BACKEND)/.env ## Create backend .env from .env.example if missing
$(BACKEND)/.env:
	cp $(BACKEND)/.env.example $(BACKEND)/.env
	@echo "created $(BACKEND)/.env"

ddb-up: ## Start DynamoDB Local in the background
	$(COMPOSE) --profile dev up -d dynamodb-local

ddb-down: ## Stop DynamoDB Local
	$(COMPOSE) --profile dev down

ddb-logs: ## Tail DynamoDB Local logs
	$(COMPOSE) --profile dev logs -f dynamodb-local

init: env ddb-up ## Ensure DDB tables exist (creates them if missing)
	@set -a; . ./$(BACKEND)/.env; set +a; \
	  ./$(BACKEND)/scripts/init-tables.sh

backend: env ## Run the backend in watch mode (assumes DDB is up + init done)
	@set -a; . ./$(BACKEND)/.env; set +a; \
	  npm --prefix $(BACKEND) run start:dev

frontend: ## Run the frontend (Vite) dev server
	npm --prefix $(FRONTEND) run dev

dev: init ## Bring up the full dev stack — backend in foreground, run `make frontend` in another shell
	$(MAKE) backend

down: ## Stop the dev stack
	$(COMPOSE) --profile dev down

clean: ## Remove build output + node_modules
	rm -rf $(BACKEND)/dist $(BACKEND)/coverage $(FRONTEND)/dist $(FRONTEND)/coverage
	rm -rf $(BACKEND)/node_modules $(FRONTEND)/node_modules

clean-port: ## Kill any process bound to the dev ports (3000, 5173). Use `make ddb-down` for DDB Local.
	@for port in $(PORTS); do \
	  pids=$$(lsof -ti:$$port 2>/dev/null | tr '\n' ' '); \
	  if [ -n "$$pids" ]; then \
	    echo ":$$port → killing $$pids"; \
	    kill -9 $$pids; \
	  else \
	    echo ":$$port free"; \
	  fi; \
	done

test: ## Run backend + frontend unit tests
	npm --prefix $(BACKEND) test
	npm --prefix $(FRONTEND) test -- --run

test-e2e: init ## Run backend e2e (boots DDB Local + seeds tables first)
	npm --prefix $(BACKEND) run test:e2e
